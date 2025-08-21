import { GoogleGenerativeAI } from "@google/generative-ai";
import { personalTrainerBlueprint } from './blueprints';
import { UserDataPayload } from 'shared-types';
import { parseLLMOutput } from './parser';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Orchestra l'intera conversazione con l'LLM per generare il codice sorgente
 * di un sito web basandosi su un payload di dati utente.
 * @param userDataPayload I dati strutturati forniti dall'utente.
 * @returns Una Promise che si risolve con la struttura dei file generata.
 */
export async function orchestrateGeneration(userDataPayload: UserDataPayload): Promise<Record<string, string>> {
    const SYSTEM_PROMPT = `
# 1. PERSONA E RUOLO
Sei un Senior Full-Stack Developer e Software Architect con 20 anni di esperienza. [cite_start]La tua specializzazione è creare applicazioni web esteticamente impeccabili, performanti e sicure utilizzando lo stack tecnologico più moderno. [cite: 143-145]

# 2. STACK TECNOLOGICO OBBLIGATORIO
- [cite_start]Framework: Next.js 14 (con App Router). [cite: 147]
- [cite_start]Styling: Tailwind CSS. [cite: 148]
- Linguaggio: JavaScript con sintassi moderna (ES6+). [cite_start]Usa componenti React funzionali con Hooks. [cite: 149]

# 3. FORMATO DELL'OUTPUT (MANDATORIO)
- [cite_start]La tua unica e sola risposta deve essere la codebase richiesta. [cite: 153]
- Ogni file deve iniziare con 'FILEPATH: percorso/del/file.js' su una singola riga, seguito dal contenuto del file.
- Separa ogni file con la stringa '---END-OF-FILE---'.

# 4. PRINCIPI DI SVILUPPO
- [cite_start]Responsiveness, Accessibilità (a11y), Performance, SEO. [cite: 157-161]
- [cite_start]Il codice deve essere "production-ready", leggibile, e componentizzato. [cite: 150]

# 5. SICUREZZA
- Utilizza solo librerie npm popolari, ben mantenute e universalmente riconosciute (es. react, next, tailwindcss, clsx, framer-motion, ecc.) per evitare malware. Non includere dipendenze non essenziali.
`;

    const chat = model.startChat({
        history: [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }, {role: "model", parts: [{text: "Sono pronto. Fornisci le specifiche del progetto."}]}],
        generationConfig: {
            maxOutputTokens: 8192,
        },
    });

    const blueprint = personalTrainerBlueprint;
    console.log(`Avvio generazione per request_id: ${userDataPayload.request_id}`);

    const mainPhases = blueprint.slice(0, -1);
    for (let i = 0; i < mainPhases.length; i++) {
        const phasePromptFunction = mainPhases[i];
        const currentPrompt = phasePromptFunction(userDataPayload);
        console.log(`Esecuzione Fase ${i + 1}...`);
        
        const result = await chat.sendMessage(currentPrompt);
        // Aggiungiamo una piccola pausa per evitare di colpire i rate limit se le fasi sono troppo veloci
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }

    console.log('Esecuzione Fase Finale: Consolidamento...');
    const finalPromptFunction = blueprint[blueprint.length - 1];
    const finalPrompt = finalPromptFunction(userDataPayload);

    const result = await chat.sendMessage(finalPrompt);
    const finalResponse = result.response;
    const finalCodebaseText = finalResponse.text();

    const fileStructure = parseLLMOutput(finalCodebaseText);

    console.log(`Generazione per ${userDataPayload.request_id} completata.`);
    return fileStructure;
}