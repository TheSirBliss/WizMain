'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Interfaccia che ricalca la struttura di UserDataPayload
// In una monorepo, la importeremmo da 'shared-types'
interface UserDataPayload {
    request_id: string;
    general: {
        projectName: string;
        businessType: string;
        style: string;
        palette: { primary: string; secondary: string; accent: string; };
    };
    pages: string[];
    structured_data: {
        contact_info: { email: string; phone: string; address: string; };
    };
}

export default function CreateProjectPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<UserDataPayload>({
        request_id: `proj-${Date.now()}`, // ID univoco per la richiesta
        general: {
            projectName: '',
            businessType: '',
            style: 'Professionale', // Valore di default
            palette: { primary: '#000000', secondary: '#FFFFFF', accent: '#FF4500' }
        },
        pages: ['Home', 'Chi Siamo', 'Servizi', 'Contatti'], // Pagine di default
        structured_data: {
            contact_info: { email: '', phone: '', address: '' }
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Logica per aggiornare lo stato annidato
        const keys = name.split('.');
        setFormData(prev => {
            let current = prev;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return { ...prev };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/v1/generate', { // Chiamata al nostro Core API
                method: 'POST',
                headers: { 'Content-Type': 'application/json', /* Authorization Header qui */ },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Errore nella creazione del progetto.');
            }

            const { projectId } = await response.json();
            // Reindirizza alla pagina di stato con l'ID del progetto
            router.push(`/dashboard/status/${projectId}`);

        } catch (error) {
            console.error(error);
            setIsLoading(false);
            // Mostra un messaggio di errore all'utente
        }
    };

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Crea un Nuovo Sito Web</h1>
            {/* Qui il form basato sui campi di 'Parsing + Prompt.docx' [cite: 319] */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Esempio di un campo */}
                <div>
                    <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Nome del Progetto</label>
                    <input
                        type="text"
                        id="projectName"
                        name="general.projectName"
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="style" className="block text-sm font-medium text-gray-700">Stile e Atmosfera [cite: 321]</label>
                    <select id="style" name="general.style" onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option>Energico</option>
                        <option>Professionale</option>
                        <option>Minimalista</option>
                        <option>Lussuoso</option>
                    </select>
                </div>
                {/* ... Aggiungere gli altri campi per Pagine, Colori, Info Contatto, etc. [cite: 320, 322, 323] */}
                <button type="submit" disabled={isLoading} className="...">{isLoading ? 'Generazione in corso...' : 'Crea Sito Web'}</button>
            </form>
        </div>
    );
}