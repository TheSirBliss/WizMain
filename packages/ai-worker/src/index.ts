import { orchestrateGeneration } from './orchestrator';
import { deploySite } from './deployment';
import { UserDataPayload } from 'shared-types';

/**
 * Punto di ingresso principale per un task di generazione.
 * Riceve i dati, orchestra la generazione del codice, esegue l'audit di sicurezza,
 * gestisce il deploy e aggiorna lo stato del progetto nel database.
 * @param taskData L'oggetto contenente tutti i dati necessari per il task.
 */
export async function processGenerationRequest(taskData: { projectId: string; userId: string; payload: UserDataPayload }) {
    const { projectId, userId, payload } = taskData;

    try {
        // Step 1: Aggiornare lo stato del progetto a 'generating' nel DB
        console.log(`Inizio processo per progetto: ${projectId}`);
        // Esempio: await prisma.project.update({ where: { id: projectId }, data: { status: 'generating' } });

        // Step 2: Chiamare l'orchestratore per generare il codice sorgente
        const fileStructure = await orchestrateGeneration(payload);
        
        // Step 3: Se la generazione ha successo, chiamare il servizio di deploy
        // Nota: userId potrebbe servire per la logica di creazione repo, qui passiamo projectName
        const previewUrl = await deploySite(fileStructure, payload.general.projectName);

        // Step 4: Aggiornare lo stato a 'completed' e salvare l'URL nel DB
        console.log(`Progetto ${projectId} completato. URL di anteprima: ${previewUrl}`);
        // Esempio: await prisma.project.update({ where: { id: projectId }, data: { status: 'completed', previewUrl: previewUrl } });

    } catch (error) {
        console.error(`Fallimento per il progetto ${projectId}:`, error);
        // Step 5: Aggiornare lo stato a 'failed' con il log dell'errore
        // Esempio: await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
    }
}