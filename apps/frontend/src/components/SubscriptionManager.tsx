'use client';

import { useState } from 'react';

// In un'app reale, questi dati proverrebbero da una chiamata API che recupera lo stato dell'utente
interface SubscriptionProps {
    isSubscribed: boolean;
    planName: string | null;
}

export default function SubscriptionManager({ isSubscribed, planName }: SubscriptionProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpgradeClick = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // L'ID del prezzo lo trovi nella dashboard di Stripe, nella sezione "Prodotti"
            const priceId = 'price_xxxxxxxxxxxxxx'; // SOSTITUISCI QUESTO

            const response = await fetch('/api/v1/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Aggiungi il token di autenticazione
                    // 'Authorization': `Bearer ${your_jwt_token}` 
                },
                body: JSON.stringify({ priceId }),
            });

            if (!response.ok) {
                throw new Error('Errore durante la creazione della sessione di pagamento.');
            }

            const { url } = await response.json();
            
            // Reindirizza l'utente alla pagina di checkout di Stripe
            window.location.href = url;

        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-2">Il Tuo Piano</h2>
            {isSubscribed ? (
                <div>
                    <p className="text-gray-700">Attualmente sei abbonato al piano <strong>{planName}</strong>.</p>
                    {/* Aggiungere un pulsante per gestire l'abbonamento (es. portale clienti Stripe) */}
                </div>
            ) : (
                <div>
                    <p className="text-gray-700 mb-4">Passa al piano Pro per sbloccare progetti illimitati, hosting automatico e domini personalizzati.</p>
                    <button
                        onClick={handleUpgradeClick}
                        disabled={isLoading}
                        className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Caricamento...' : 'Upgrade a Pro'}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
            )}
        </div>
    );
}