// server.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

import { processGenerationRequest } from './ai-worker/index';
import { UserDataPayload } from './ai-worker/types';
import { parseLLMOutput } from './ai-worker/parser';
import { deploySite } from './ai-worker/deployment';
import { authenticateToken } from './middleware/auth';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();

function assertEnv(name: string) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
  return process.env[name] as string;
}

const STRIPE_API_KEY = assertEnv('STRIPE_API_KEY');
const FRONTEND_URL = assertEnv('FRONTEND_URL');
const STRIPE_WEBHOOK_SECRET = assertEnv('STRIPE_WEBHOOK_SECRET');

const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2024-04-10' });

const port = assertEnv('PORT');

/* =========================
   Basic middleware
   ========================= */
app.use(cors());

// IMPORTANT: We must NOT apply express.json() to the Stripe webhook path,
// otherwise the raw body needed for signature verification is lost.
// So we add json() conditionally to all other requests.
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/stripe/webhooks')) {
    return next();
  }
  return express.json()(req, res, next);
});

/* =========================
   Health / root
   ========================= */
app.get('/', (_req: Request, res: Response) => {
  res.send('AI Wizard Core API is running!');
});

/* =========================
   /test — runs a local file through your parser & deploy
   ========================= */
app.get('/test', async (_req: Request, res: Response) => {
  try {
    const filename = path.resolve(process.cwd(), 'fileToload.txt');
    const data = fs.readFileSync(filename, 'utf-8');

    const parsed = parseLLMOutput(data);
    const record = await deploySite(parsed, 'PROJECT-TEST');

    return res.status(200).json({
      ok: true,
      message: 'Test processed and site deployed.',
      record,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[TEST] Error:', msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

/* =========================
   /ai-worker — kicks off a generation request with sample data
   ========================= */
app.get('/ai-worker', async (_req: Request, res: Response) => {
  try {
    const data: UserDataPayload = {
      request_id: `proj-${Date.now()}`,
      general: {
        projectName:  `greenGarden-${Date.now()}`,
        businessType: 'Servizi di giardinaggio',
        targetAudience: 'Privati e aziende locali',
        style: 'Moderno e minimal',
        palette: { primary: '#2E7D32', secondary: '#A5D6A7', accent: '#FFC107' },
        font: 'Roboto',
      },
      pages: ['Home', 'Servizi', 'Testimonianze', 'Contatti'],
      structured_data: {
        services: [
          { name: 'Manutenzione giardini', description: 'Cura periodica del verde e potature.' },
          { name: 'Progettazione', description: 'Creazione di spazi verdi personalizzati.' },
        ],
        testimonials: [
          { author: 'Mario Rossi', quote: 'Servizio eccellente e professionale!' },
          { author: 'Anna Bianchi', quote: 'Il mio giardino non è mai stato così bello.' },
        ],
        contact_info: {
          address: 'Via Roma 10, Milano',
          phone: '+39 345 678 9012',
          email: 'info@greengarden.it',
        },
      },
      special_features: {
        booking_form: true,
        blog_section: true,
        testimonials_carousel: true,
      },
    };

    const result = await processGenerationRequest({
      projectId: 'TEST',
      userId: 'TEST',
      payload: data,
    });

    return res.status(200).json({ ok: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AI-WORKER] Error:', msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

/* =========================
   Stripe: setup + routes (merged)
   ========================= */
const prisma = new PrismaClient();


app.post('/stripe/create-checkout-session', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user?.id as string | undefined;
  const { priceId } = req.body as { priceId?: string };

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!priceId) return res.status(400).json({ error: 'Price ID is required.' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: user.stripeCustomerId || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/dashboard?payment=cancelled`,
      // If you want to force specific methods, uncomment the line below:
      // payment_method_types: ['card'],
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { userId },
      // Optional niceties:
      billing_address_collection: 'auto',
      customer_update: { address: 'auto', name: 'auto' },
      locale: 'auto',
      // automatic_tax: { enabled: true }, // only if you've set up Stripe Tax
    };

    const session = await stripe.checkout.sessions.create(params);
    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('[Stripe] Checkout Error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Webhook: must receive the RAW body — mount BEFORE any express.json on this path.
 */
app.post(
  '/stripe/webhooks',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      console.warn('[Stripe] Missing/invalid signature header.');
      return res.sendStatus(400);
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('⚠️  Webhook signature verification failed:', msg);
      return res.sendStatus(400);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

          if (!userId || !stripeCustomerId || !subscriptionId) {
            console.warn('[Webhook] Missing fields on checkout.session.completed', {
              userId,
              stripeCustomerId,
              subscriptionId,
            });
            break;
          }

          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId },
          });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const item = subscription.items.data[0];
          const priceId = item?.price?.id ?? 'unknown_price';

          await prisma.subscription.upsert({
            where: { id: subscription.id },
            create: {
              id: subscription.id,
              userId,
              planId: priceId,
              status: subscription.status as any,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
            update: {
              planId: priceId,
              status: subscription.status as any,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });

          console.log(`✅ Subscription ${subscription.id} activated for user ${userId}`);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription?.id;
          if (!subId) break;

          const updated = await stripe.subscriptions.retrieve(subId);
          await prisma.subscription.update({
            where: { id: updated.id },
            data: {
              status: updated.status as any,
              currentPeriodEnd: new Date(updated.current_period_end * 1000),
            },
          });

          console.log(
            `💚 Invoice paid. Subscription ${updated.id} renewed until ${new Date(
              updated.current_period_end * 1000
            ).toISOString()}`
          );
          break;
        }

        case 'invoice.payment_failed': {
          const failedInvoice = event.data.object as Stripe.Invoice;
          const subId =
            typeof failedInvoice.subscription === 'string'
              ? failedInvoice.subscription
              : failedInvoice.subscription?.id;
          if (!subId) break;

          await prisma.subscription.update({
            where: { id: subId },
            data: { status: 'past_due' as any },
          });

          console.log(`⚠️ Payment failed for subscription ${subId}. Marked as past_due.`);
          break;
        }

        case 'customer.subscription.deleted': {
          const deletedSub = event.data.object as Stripe.Subscription;

          await prisma.subscription.update({
            where: { id: deletedSub.id },
            data: { status: 'canceled' as any },
          });

          console.log(`🗑️ Subscription ${deletedSub.id} cancelled.`);
          break;
        }

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      // Always a 2xx after successful verification so Stripe stops retrying
      return res.json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Webhook] Handler error for ${event.id} (${event.type}):`, msg);
      // Still acknowledge to prevent repeated retries; alert internally.
      return res.json({ received: true, warning: 'internal handler error' });
    }
  }
);

/* =========================
   Global error handler (last)
   ========================= */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).json({ error: 'Unexpected error' });
});

/* =========================
   Start server
   ========================= */
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
