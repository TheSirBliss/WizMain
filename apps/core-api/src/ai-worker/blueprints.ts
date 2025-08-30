// Path: lib/blueprints.ts

import { UserDataPayload } from './types';

/**
 * Blueprint per la generazione di un sito per Personal Trainer.
 * Ogni funzione rappresenta una fase incrementale di costruzione,
 * che verrà eseguita in sequenza dall'orchestratore.
 */
export const personalTrainerBlueprint = [
  // Fase 1: Creazione della struttura base e della Homepage
  (data: UserDataPayload): string => `
    [ACTION] Fase 1: Genera la struttura di base e la Homepage del sito per '${data.general.projectName}'.
    [DETAILS] Lo stile deve essere '${data.general.style}' con i colori ${JSON.stringify(data.general.palette)}. La homepage deve avere un titolo di impatto e introdurre i servizi. Includi una navbar con i link alle pagine: ${data.pages.join(', ')}. Assicurati di creare anche tutti i file di configurazione necessari (package.json, tailwind.config.ts, etc.).
  `,

  // Fase 2: Creazione delle pagine statiche (Chi Sono, Contatti)
  (data: UserDataPayload): string => `
    [ACTION] Fase 2: Basandoti sulla struttura creata, ora genera il contenuto completo per le pagine '/chi-sono' e '/contatti'.
    [DETAILS] Usa le informazioni di contatto fornite: ${JSON.stringify(data.structured_data.contact_info)}. La pagina 'Chi Sono' deve parlare della filosofia del brand.
  `,

  // Fase 3: Creazione della pagina Servizi con dati strutturati
  (data: UserDataPayload): string => `
    [ACTION] Fase 3: Crea la pagina '/servizi'.
    [DETAILS] Popola la pagina dinamicamente usando questi dati: ${JSON.stringify(data.structured_data.services)}. Aggiungi un pulsante 'Prenota' sotto ogni servizio.
  `,

  // Fase 4: Implementazione delle funzionalità interattive (Blog e Testimonianze)
  (data: UserDataPayload): string => `
    [ACTION] Fase 4: Implementa le sezioni dinamiche. Crea la struttura per il Blog come richiesto e aggiungi il carosello delle testimonianze nella Homepage usando questi dati: ${JSON.stringify(data.structured_data.testimonials)}.
  `,

  // Fase 5: Finalizzazione (Footer, Pagine Legali e SEO)
  (data: UserDataPayload): string => `
    [ACTION] Fase 5: Completa il sito. Aggiungi un footer completo su tutte le pagine e crea le pagine /privacy-policy e /cookie-policy con testo placeholder. Ottimizza i metatag SEO per ogni pagina.
  `,

  // Fase Finale: Consolidamento
  (data: UserDataPayload): string => `
    [ACTION] Fase Finale: Ottimo lavoro. Ora consolida tutto il codice che hai scritto nelle fasi precedenti. Genera la codebase COMPLETA E FINALE in un singolo output. Assicurati che ogni file necessario (configurazioni, layout, pagine, componenti) sia presente e corretto.
  `
];