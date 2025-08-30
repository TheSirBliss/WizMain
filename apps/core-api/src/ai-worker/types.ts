// Path: lib/types.ts

/**
 * Definisce la struttura completa dei dati inviati dal frontend al backend.
 * Questo payload contiene tutte le informazioni necessarie per orchestrare
 * la generazione del sito in tutte le sue fasi.
 */
export interface UserDataPayload {
  request_id: string;
  general: {
    projectName: string;
    businessType: string;
    targetAudience: string;
    style: string;
    palette: {
      primary: string;
      secondary: string;
      accent: string;
    };
    font: string;
  };
  pages: string[];
  structured_data: {
    services?: { name: string; description: string }[];
    testimonials?: { author: string; quote: string }[];
    contact_info?: {
      address: string;
      phone: string;
      email: string;
    };
    // Qui possono essere aggiunti altri tipi di dati strutturati (menu, prodotti, etc.)
  };
  special_features: {
    booking_form?: boolean;
    blog_section?: boolean;
    testimonials_carousel?: boolean;
  };
}