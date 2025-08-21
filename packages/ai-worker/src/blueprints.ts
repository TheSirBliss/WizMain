import { UserDataPayload } from 'shared-types';

// Implementazione del blueprint di esempio dal documento [cite: 214]
export const personalTrainerBlueprint = [
  // Fase 1: Struttura base e Homepage
  (data: UserDataPayload) => `
    [ACTION] Fase 1: Genera la struttura di base e la Homepage del sito per '${data.general.projectName}'.
    [DETAILS] Stile: '${data.general.style}'. Palette: ${JSON.stringify(data.general.palette)}.
    Includi una navbar con i link alle pagine: ${data.pages.join(', ')}.
    Rispondi solo con il codice modificato o aggiunto in questa fase. Non rigenerare codice già scritto.
  `,
  // Fase 2: Pagine statiche
  (data: UserDataPayload) => `
    [ACTION] Fase 2: Basandoti sulla struttura creata, ora genera il contenuto completo per le pagine '/chi-sono' e '/contatti'.
    [DETAILS] Usa le informazioni di contatto: ${JSON.stringify(data.structured_data.contact_info)}.
    Rispondi solo con il codice modificato o aggiunto in questa fase. Non rigenerare codice già scritto.
  `,
  // Fase 3: Pagina Servizi
  (data: UserDataPayload) => `
    [ACTION] Fase 3: Crea la pagina '/servizi'.
    [DETAILS] Popola la pagina usando questi dati: ${JSON.stringify(data.structured_data.services)}.
    Rispondi solo con il codice modificato o aggiunto in questa fase. Non rigenerare codice già scritto.
  `,
  // Fase Finale: Consolidamento
  (data: UserDataPayload) => `
    [ACTION] Fase Finale: Ottimo lavoro. Ora consolida tutto il codice che hai scritto nelle fasi precedenti.
    [FORMAT] Genera la struttura completa e finale del progetto, includendo ogni singolo file necessario per l'esecuzione. Usa il formato FILEPATH e ---END-OF-FILE--- come specificato nelle istruzioni iniziali.
  `
];