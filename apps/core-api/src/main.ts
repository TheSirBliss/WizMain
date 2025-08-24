import express from 'express';
import {processGenerationRequest} from './ai-worker/index'
import { UserDataPayload } from './ai-worker/utils';
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('AI Wizard Core API is running!');
});

app.get('/ai-worker', (req, res) => {
  const data : UserDataPayload = {
        request_id: `proj-${Date.now()}`, // ID univoco per la richiesta
        general: {
            projectName: '',
            businessType: '',
            style: 'Professionale', // Valore di default
            palette: { primary: '#000000', secondary: '#FFFFFF', accent: '#FF4500' }
        },
        pages: ['Home', 'Chi Siamo', 'Servizi', 'Contatti'], // Pagine di default
        structured_data: {
            contact_info: { email: '', phone: '', address: '' },
            services: "test"
        }
    }

  processGenerationRequest( { projectId: "TEST", userId: "TEST", payload: data})
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});