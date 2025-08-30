// Path: app/api/orchestrator/route.ts

import { NextResponse } from "next/server";
import { UserDataPayload } from "./types";
import { personalTrainerBlueprint } from "./blueprints";
import { parseLLMOutput } from "./parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Ollama from "ollama";

dotenv.config();

/** ------------------- Provider Selector ------------------- */
function getProvider() {
  const model = process.env.MODEL?.trim();
  if (!model)
    throw new Error(
      "Missing MODEL in .env (e.g. gemini-1.5-flash or gemma3:1b)"
    );

  const isGemini = model.toLowerCase().startsWith("gemini");
  return { provider: isGemini ? "gemini" : "ollama", modelName: model };
}

/** ------------------- Chat Abstraction ------------------- */
interface LLMChat {
  sendMessage(prompt: string): Promise<{ text: string }>;
}

class GeminiChat implements LLMChat {
  private chat: ReturnType<
    ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["startChat"]
  >;

  constructor(modelName: string, systemPrompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    this.chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [
            {
              text: "Istruzioni ricevute. Sono pronto a generare il codice nel formato richiesto, fase per fase.",
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 8192 },
    });
  }

  async sendMessage(prompt: string) {
    const result = await this.chat.sendMessage(prompt);
    return { text: result.response.text() };
  }
}
import ollama from "ollama";

class OllamaChat implements LLMChat {
  private model: string;
  private messages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[] = [];

  constructor(modelName: string, systemPrompt: string) {
    this.model = modelName;

    this.messages.push({ role: "system", content: systemPrompt });
    this.messages.push({
      role: "assistant",
      content:
        "Istruzioni ricevute. Sono pronto a generare il codice nel formato richiesto, fase per fase.",
    });
  }

  async sendMessage(prompt: string) {
    this.messages.push({ role: "user", content: prompt });

    const res = await ollama.chat({
      model: this.model,
      messages: this.messages,
      stream: false,
      options: { num_ctx: 32000, num_predict: -1, temperature: 0.4 },
    });

    const text = res.message?.content ?? "";
    this.messages.push({ role: "assistant", content: text });
    return { text };
  }
}

/** Factory */
function createLLMChat(systemPrompt: string): LLMChat {
  const { provider, modelName } = getProvider();
  if (provider === "gemini") return new GeminiChat(modelName, systemPrompt);
  return new OllamaChat(modelName, systemPrompt);
}

/** ------------------- API Handler ------------------- */
export async function POST(req: Request) {
  try {
    const userDataPayload: UserDataPayload = await req.json();

    console.log(
      `[WizMain Orchestrator] Avvio generazione per request_id: ${userDataPayload.request_id}`
    );

    const fileStructure = await orchestrateGeneration(userDataPayload);

    console.log(
      `[WizMain Orchestrator] Generazione completata per request_id: ${
        userDataPayload.request_id
      }. File generati: ${Object.keys(fileStructure).length}`
    );

    return NextResponse.json(fileStructure, { status: 200 });
  } catch (error) {
    console.error(
      "[WizMain Orchestrator] Errore critico durante la generazione:",
      error
    );
    return NextResponse.json(
      { error: "La generazione del sito è fallita." },
      { status: 500 }
    );
  }
}

/** ------------------- Orchestration ------------------- */
export async function orchestrateGeneration(
  userDataPayload: UserDataPayload
): Promise<Record<string, string>> {
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
- Ogni blocco di codice DEVE iniziare con una riga contenente ESATTAMENTE "FILEPATH: **percorso/del/file.tsx**".
- Ogni blocco di codice DEVE terminare con una riga contenente ESATTAMENTE "---END-OF-FILE---".
es:
FILEPATH: src/pages/Home.tsx
<codice>
---END-OF-FILE---
        


# 4. PRINCIPI DI SVILUPPO
- **Completezza:** Assicurati di generare TUTTI i file necessari per un'applicazione Next.js funzionante, inclusi package.json, tailwind.config.ts, next.config.mjs, postcss.config.js, app/layout.tsx, app/globals.css.
- **Qualità:** Il codice deve essere pulito, componentizzato, responsive e accessibile (a11y).
- **Sicurezza:** Utilizza solo librerie npm popolari e ben mantenute. Le dipendenze base devono essere: react, react-dom, next, tailwindcss, postcss, autoprefixer, typescript, @types/react, @types/node, clsx, framer-motion.
`.trim();

  const chat = createLLMChat(SYSTEM_PROMPT);
  const blueprint = personalTrainerBlueprint;

  const mainPhases = blueprint.slice(0, -1);
  const finalPhase = blueprint[blueprint.length - 1];

  for (let i = 0; i < mainPhases.length; i++) {
    const phasePromptFunction = mainPhases[i];
    const currentPrompt = phasePromptFunction(userDataPayload);
    console.log(
      `[WizMain Orchestrator] Esecuzione Fase ${i + 1}/${mainPhases.length}...`
    );
    await chat.sendMessage(currentPrompt);
  }

  console.log(
    "[WizMain Orchestrator] Esecuzione Fase Finale: Consolidamento..."
  );
  const finalPrompt = finalPhase(userDataPayload);
  const result = await chat.sendMessage(finalPrompt);

  console.log("[WizMain Orchestrator] Parsing della codebase finale...");
  const fileStructure = parseLLMOutput(result.text);

  return fileStructure;
}
