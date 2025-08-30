/**
 * Analizza la stringa di testo grezza proveniente dall'LLM, che usa un formato
 * Markdown con nomi di file in grassetto e blocchi di codice.
 * @param responseText La stringa completa restituita dall'LLM.
 * @returns Un oggetto Record<string, string> che rappresenta la struttura dei file.
 */
export function parseLLMOutput(responseText: string): Record<string, string> {
    console.log("[parseLLMOutput]",responseText);
    
    console.log("Inizio parsing dell'output LLM (versione Markdown)...");
    const fileStructure: Record<string, string> = {};

    // Questa espressione regolare cerca il pattern:
    // **`nome/del/file.tsx`:** (con variazioni)
    // ```linguaggio
    // ...codice...
    // ```
    const regex = /\*\*(.*?):\*\*\s+```(.+?)```/gs;

    // Usiamo matchAll per trovare tutte le occorrenze nel testo
    const matches = responseText.matchAll(regex);

    for (const match of matches) {
        // match[1] è il primo gruppo catturato -> il percorso del file
        const filePath = match[1].trim();
        // match[2] è il secondo gruppo catturato -> il contenuto del file
        const fileContent = match[2].trim();

        if (filePath && fileContent) {
            console.log(`File trovato: ${filePath}`);
            fileStructure[filePath] = fileContent;
        }
    }

    if (Object.keys(fileStructure).length === 0) {
        console.warn("Parsing completato, ma nessun file è stato estratto. La risposta dell'AI potrebbe avere un formato inatteso.");
    } else {
        console.log("Parsing completato con successo.");
    }

    return fileStructure;
}