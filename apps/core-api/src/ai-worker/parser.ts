/**
 * Analizza la stringa di testo grezza proveniente dall'LLM e la trasforma in un oggetto
 * strutturato dove la chiave è il percorso del file e il valore è il suo contenuto.
 * @param responseText La stringa completa restituita dall'LLM.
 * @returns Un oggetto Record<string, string> che rappresenta la struttura dei file.
 */
export function parseLLMOutput(responseText: string): Record<string, string> {
    console.log("Inizio parsing dell'output LLM...");
    const fileDelimiter = '---END-OF-FILE---'; //
    const pathMarker = 'FILEPATH:'; //
    const fileStructure: Record<string, string> = {}; //

    const fileBlocks = responseText.split(fileDelimiter); //

    for (const block of fileBlocks) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) { //
            continue;
        }

        const pathMarkerIndex = trimmedBlock.indexOf(pathMarker);
        if (pathMarkerIndex === -1) { //
            console.warn("Blocco ignorato perché non contiene FILEPATH:", trimmedBlock.substring(0, 100));
            continue;
        }

        const endOfPathLine = trimmedBlock.indexOf('\n');
        if (endOfPathLine === -1) {
            console.warn("Blocco ignorato perché malformato (manca a-capo dopo FILEPATH):", trimmedBlock.substring(0, 100));
            continue;
        }
        
        const pathLine = trimmedBlock.substring(0, endOfPathLine).trim(); //
        const filePath = pathLine.replace(pathMarker, '').trim(); //
        const fileContent = trimmedBlock.substring(endOfPathLine + 1).trimStart(); // Usiamo trimStart per preservare l'indentazione iniziale del codice

        if (filePath && fileContent) { //
            console.log(`File trovato: ${filePath}`);
            fileStructure[filePath] = fileContent; //
        }
    }
    console.log("Parsing completato.");
    return fileStructure;
}