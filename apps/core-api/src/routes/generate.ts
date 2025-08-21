import { Router } from 'express';
import { authenticateToken } from '../middleware/auth'; // Middleware per validare JWT [cite: 384]
// import { pubSubClient } from '../services/pubsub'; // Client per la coda di messaggi

const router = Router();

router.post('/', authenticateToken, async (req, res) => {
    const userId = req.user.id; // ID utente dal token JWT
    const userDataPayload = req.body; // Dati dal form guidato del frontend

    // 1. Validare il payload (usando una libreria come Zod)
    
    // 2. Creare un record 'Project' nel database con stato 'pending'
    // const project = await prisma.project.create({ ... });

    // 3. Inoltrare il task al Worker AI tramite la coda di messaggi 
    const taskData = { projectId: project.id, userId, payload: userDataPayload };
    // await pubSubClient.topic('generate-site-topic').publishJSON(taskData);

    // 4. Rispondere immediatamente al client [cite: 304]
    res.status(202).json({
        message: "Richiesta ricevuta! Il tuo sito è in fase di creazione.",
        projectId: project.id
    });
});

// Endpoint per il polling dello stato [cite: 370]
router.get('/status/:projectId', authenticateToken, async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Recupera lo stato del progetto dal DB, assicurandosi che appartenga all'utente
    // const project = await prisma.project.findFirst({ where: { id: projectId, userId }});

    if (!project) {
        return res.status(404).json({ message: 'Progetto non trovato.' });
    }

    res.status(200).json({
        projectId: project.id,
        status: project.status
    });
});

export default router;