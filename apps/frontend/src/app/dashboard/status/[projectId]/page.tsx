'use client';

import { useEffect, useState } from 'react';

type Status = 'pending' | 'generating' | 'completed' | 'failed';

export default function StatusPage({ params }: { params: { projectId: string } }) {
    const { projectId } = params;
    const [status, setStatus] = useState<Status>('pending');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const pollStatus = async () => {
            try {
                const response = await fetch(`/api/v1/generate/status/${projectId}`, {
                    headers: { /* Authorization Header qui */ }
                });
                if (!response.ok) throw new Error('Impossibile recuperare lo stato.');

                const data = await response.json();
                setStatus(data.status);

            } catch (err) {
                setError('Si è verificato un errore.');
                console.error(err);
            }
        };

        // Esegui il polling solo se lo stato non è terminale
        if (status === 'pending' || status === 'generating') {
            const intervalId = setInterval(pollStatus, 5000); // Poll ogni 5 secondi
            return () => clearInterval(intervalId); // Pulisci l'intervallo quando il componente viene smontato
        }
    }, [status, projectId]);


    const renderStatusMessage = () => {
        switch (status) {
            case 'pending': return "Il tuo progetto è in coda di elaborazione...";
            case 'generating': return "Stiamo generando il codice del tuo sito. Potrebbe richiedere qualche minuto...";
            case 'completed': return "🎉 Il tuo sito è pronto! Sarai reindirizzato a breve.";
            case 'failed': return "❌ Si è verificato un errore durante la generazione.";
            default: return "Recupero dello stato in corso...";
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-semibold mb-4">Stato Generazione Progetto</h1>
            <p className="text-lg">{renderStatusMessage()}</p>
            {/* Aggiungere un link per vedere il sito quando 'completed' */}
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
}