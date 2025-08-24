import { GoogleGenerativeAI } from "@google/generative-ai";
import { personalTrainerBlueprint } from './blueprints'; // Importiamo il tuo blueprint
import { UserDataPayload } from './utils';
import { parseLLMOutput } from './parser';
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function orchestrateGeneration(userDataPayload: UserDataPayload): Promise<Record<string, string>> {
    // Recuperiamo il nostro prompt di sistema
    const SYSTEM_PROMPT = `
        # 1. PERSONA E RUOLO
        Sei un Senior Full-Stack Developer e Software Architect con 20 anni di esperienza. [cite: 326]
        La tua specializzazione è creare applicazioni web esteticamente impeccabili, performanti e sicure utilizzando lo stack tecnologico più moderno.
        
        # 2. STACK TECNOLOGICO OBBLIGATORIO
        - **Framework:** Next.js 14 (con App Router).
        - **Styling:** Tailwind CSS.
        - **Linguaggio:** JavaScript con sintassi moderna (ES6+).
        
        # 3. FORMATO DELL'OUTPUT (MANDATORIO)
        - Per le risposte intermedie, fornisci solo il codice per i file modificati o aggiunti.
        - Per la risposta finale, fornisci l'intera struttura come oggetto JSON. [cite: 335-338]
        
        # 4. PRINCIPI DI SVILUPPO
        - Responsiveness, Accessibilità (a11y), Performance, SEO.
        - L'output deve essere "production-ready", leggibile, e componentizzato.

        # 5. SICUREZZA
        - Utilizza solo librerie npm popolari, ben mantenute e universalmente riconosciute (es. react, next, tailwindcss, clsx, framer-motion, ecc.) per evitare malware. Non includere dipendenze non essenziali.
    `;

    // Inizializziamo la cronologia della conversazione con il prompt di sistema
    const chat = model.startChat({
        history: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, {role: 'model', parts: [{text: 'Sono pronto. Fornisci le specifiche del progetto.'}]}],
        generationConfig: { maxOutputTokens: 8192 },
    });

    const blueprint = personalTrainerBlueprint;
    console.log(`Avvio generazione per request_id: ${userDataPayload.request_id}`);

    // Eseguiamo tutte le fasi, tranne l'ultima (consolidamento)

    for (let i = 0; i < blueprint.length; i++) {
        const phasePromptFunction = blueprint[i];
        const currentPrompt = phasePromptFunction(userDataPayload);
        console.log(`Esecuzione Fase ${i + 1}...`);
        
        // Chiamiamo l'AI e manteniamo la cronologia
        const result = await chat.sendMessage(currentPrompt);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Eseguiamo l'ultima fase, quella di consolidamento
    console.log('Esecuzione Fase Finale: Consolidamento...');
    const finalPromptFunction = blueprint[blueprint.length - 1];
    const finalPrompt = finalPromptFunction(userDataPayload);

    const result = await chat.sendMessage(finalPrompt); 
    const finalCodebaseText = result.response.text();

    // A questo punto, 'finalCodebaseText' contiene l'intera codebase come singola stringa
    const fileStructure = parseLLMOutput(finalCodebaseText); 

    console.log(`Generazione per ${userDataPayload.request_id} completata.`);
    return fileStructure;
}
