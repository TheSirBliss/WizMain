import express from 'express';
import {processGenerationRequest} from './ai-worker/index'
import { UserDataPayload } from './ai-worker/types';
import {parseLLMOutput} from './ai-worker/parser'
import {deploySite} from './ai-worker/deployment'
import * as fs from "fs";

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('AI Wizard Core API is running!');
});

app.get('/test', (req,res) => {
console.log(process.cwd());
const data: string = fs.readFileSync("fileToload.txt", "utf-8");
console.log(data);
const dataFile = parseLLMOutput(data);
const recordFile = deploySite(dataFile, "PROJECT-TEST");


});

app.get('/ai-worker', (req, res) => {
    const data: UserDataPayload = {
  request_id: `proj-${Date.now()}`,
  general: {
    projectName: "GreenGarden",
    businessType: "Servizi di giardinaggio",
    targetAudience: "Privati e aziende locali",
    style: "Moderno e minimal",
    palette: {
      primary: "#2E7D32",
      secondary: "#A5D6A7",
      accent: "#FFC107",
    },
    font: "Roboto",
  },
  pages: ["Home", "Servizi", "Testimonianze", "Contatti"],
  structured_data: {
    services: [
      { name: "Manutenzione giardini", description: "Cura periodica del verde e potature." },
      { name: "Progettazione", description: "Creazione di spazi verdi personalizzati." },
    ],
    testimonials: [
      { author: "Mario Rossi", quote: "Servizio eccellente e professionale!" },
      { author: "Anna Bianchi", quote: "Il mio giardino non è mai stato così bello." },
    ],
    contact_info: {
      address: "Via Roma 10, Milano",
      phone: "+39 345 678 9012",
      email: "info@greengarden.it",
    },
  },
  special_features: {
    booking_form: true,
    blog_section: true,
    testimonials_carousel: true,
  },
};


  processGenerationRequest( { projectId: "TEST", userId: "TEST", payload: data})
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});