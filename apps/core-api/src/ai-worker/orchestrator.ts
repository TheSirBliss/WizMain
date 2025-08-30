// Path: app/api/orchestrator/route.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { UserDataPayload } from "./types";
import { personalTrainerBlueprint } from "./blueprints";
import { parseLLMOutput } from "./parser";
import dotenv from "dotenv";
dotenv.config();
// Inizializza il client di Gemini (la API Key viene letta dalle variabili d'ambiente)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Funzione principale dell'API che gestisce la richiesta di generazione del sito.
 */
export async function POST(req: Request) {
    try {
        const userDataPayload: UserDataPayload = await req.json();

        console.log(`[WizMain Orchestrator] Avvio generazione per request_id: ${userDataPayload.request_id}`);

        const fileStructure = await orchestrateGeneration(userDataPayload);
        
        console.log(`[WizMain Orchestrator] Generazione completata per request_id: ${userDataPayload.request_id}. File generati: ${Object.keys(fileStructure).length}`);

        return NextResponse.json(fileStructure, { status: 200 });

    } catch (error) {
        console.error("[WizMain Orchestrator] Errore critico durante la generazione:", error);
        return NextResponse.json({ error: "La generazione del sito è fallita." }, { status: 500 });
    }
}

/**
 * Orchestra una serie di chiamate all'LLM per costruire un sito web completo.
 * @param userDataPayload I dati strutturati forniti dall'utente.
 * @returns Un oggetto che rappresenta la struttura dei file del sito web.
 */
export async function orchestrateGeneration(userDataPayload: UserDataPayload): Promise<Record<string, string>> {
    
    const SYSTEM_PROMPT = `
        # 1. PERSONA E RUOLO
        Sei un Senior Full-Stack Developer e Software Architect con 20 anni di esperienza, specializzato in Next.js. Il tuo compito è scrivere codice "production-ready".

        # 2. STACK TECNOLOGICO OBBLIGATORIO
        - **Framework:** Next.js 14 (con App Router)
        - **Linguaggio:** TypeScript (usa file .ts e .tsx)
        - **Styling:** Tailwind CSS. Usa la libreria 'clsx' per gestire le classi condizionali.

        # 3. FORMATO DELL'OUTPUT (MANDATORIO E RIGIDO)
        - La tua intera risposta DEVE SEMPRE contenere solo blocchi di codice.
        - Non includere MAI testo conversazionale o spiegazioni al di fuori di questi blocchi.
        - Genera l’output esclusivamente in questo formato:
        **filepath/filename**
        \`\`\`javascript
        <contenuto>
        \`\`\`


        # 4. PRINCIPI DI SVILUPPO
        - **Completezza:** Assicurati di generare TUTTI i file necessari per un'applicazione Next.js funzionante, inclusi package.json, tailwind.config.ts, next.config.mjs, postcss.config.js, app/layout.tsx, app/globals.css.
        - **Qualità:** Il codice deve essere pulito, componentizzato, responsive e accessibile (a11y).
        - **Sicurezza:** Utilizza solo librerie npm popolari e ben mantenute. Le dipendenze base devono essere: react, react-dom, next, tailwindcss, postcss, autoprefixer, typescript, @types/react, @types/node, clsx, framer-motion.
  
    `;

    // Inizializziamo una sessione di chat con la nostra "costituzione"
    const chat = model.startChat({
        history: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Istruzioni ricevute. Sono pronto a generare il codice nel formato richiesto, fase per fase.' }] }
        ],
        generationConfig: { maxOutputTokens: 8192 },
    });

    const blueprint = personalTrainerBlueprint; // In futuro qui potresti selezionare il blueprint dinamicamente

    // Separiamo le fasi di costruzione dalla fase finale di consolidamento
    const mainPhases = blueprint.slice(0, -1);
    const finalPhase = blueprint[blueprint.length - 1];

    // Eseguiamo le fasi di costruzione in sequenza
    for (let i = 0; i < mainPhases.length; i++) {
        const phasePromptFunction = mainPhases[i];
        const currentPrompt = phasePromptFunction(userDataPayload);
        
        console.log(`[WizMain Orchestrator] Esecuzione Fase ${i + 1}/${mainPhases.length}...`);
        
        await chat.sendMessage(currentPrompt);
    }

    // Eseguiamo l'ultima fase, quella di consolidamento
    console.log('[WizMain Orchestrator] Esecuzione Fase Finale: Consolidamento...');
    const finalPrompt = finalPhase(userDataPayload);

    const result = await chat.sendMessage(finalPrompt);
    const finalCodebaseText = result.response.text();

    // Parsiamo l'output finale per ottenere la struttura dei file
    console.log('[WizMain Orchestrator] Parsing della codebase finale...');
    const fileStructure = parseLLMOutput(finalCodebaseText);

    return fileStructure;
}