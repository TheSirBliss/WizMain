import { Router } from 'express';
import express from 'express'; // Importa express per il middleware raw
import { authenticateToken } from '../middleware/auth';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: '2024-06-20',
});

// --- Endpoint per creare una sessione di checkout ---
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    const userId = req.user!.id;
    const { priceId } = req.body; // Es. 'price_1P...'

    if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).send('User not found.');

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: user.stripeCustomerId || undefined,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard?payment=cancelled`,
            metadata: { userId: userId }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- Endpoint per ricevere i Webhooks da Stripe ---
router.post('/webhooks', express.raw({type: 'application/json'}), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, signature!, webhookSecret);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return res.sendStatus(400);
    }

    // Gestisci l'evento
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata!.userId;
            const stripeCustomerId = session.customer as string;
            const subscriptionId = session.subscription as string;

            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: stripeCustomerId },
            });
            
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await prisma.subscription.create({
                data: {
                    id: subscription.id, // Usa l'ID di Stripe per coerenza
                    userId: userId,
                    planId: 'pro',
                    status: 'active',
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                }
            });
            console.log(`✅ Abbonamento attivato per l'utente ${userId}`);
            break;

        case 'invoice.payment_succeeded':
            const invoice = event.data.object as Stripe.Invoice;
            const subIdSucceeded = invoice.subscription as string;
            const updatedSub = await stripe.subscriptions.retrieve(subIdSucceeded);
            
            await prisma.subscription.update({
                where: { id: updatedSub.id },
                data: { 
                    status: 'active', // Assicurati che sia attivo
                    currentPeriodEnd: new Date(updatedSub.current_period_end * 1000)
                },
            });
            console.log(`Rinnovo registrato per l'abbonamento ${updatedSub.id}`);
            break;
            
        case 'invoice.payment_failed':
            const failedInvoice = event.data.object as Stripe.Invoice;
            const subIdFailed = failedInvoice.subscription as string;
            
            // L'utente ha un pagamento fallito. Aggiorniamo lo stato.
            // Stripe tenterà di recuperare il pagamento.
            await prisma.subscription.update({
                where: { id: subIdFailed },
                data: { status: 'past_due' },
            });
            console.log(`Pagamento fallito per l'abbonamento ${subIdFailed}. Stato impostato a 'past_due'.`);
            // Qui potresti inviare un'email all'utente per aggiornare il metodo di pagamento.
            break;

        case 'customer.subscription.deleted':
            const deletedSub = event.data.object as Stripe.Subscription;
            
            // L'abbonamento è stato cancellato (dall'utente o per mancato pagamento).
            await prisma.subscription.update({
                where: { id: deletedSub.id },
                data: { status: 'canceled' },
            });
            console.log(`Abbonamento ${deletedSub.id} cancellato.`);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

export default router;