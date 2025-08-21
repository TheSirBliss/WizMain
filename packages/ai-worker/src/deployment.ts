import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';
// NOTA: Per interagire con GitHub e Vercel, avrai bisogno di client API
// npm install @octokit/rest node-fetch
import { Octokit } from "@octokit/rest";
import fetch from 'node-fetch';


const execAsync = promisify(exec);

/**
 * Gestisce l'intero ciclo di vita del deploy: scrive i file, esegue un audit di sicurezza,
 * e se ha successo, pusha su GitHub e triggera il deploy su Vercel.
 * @param fileStructure La struttura dei file generata dall'AI.
 * @param projectName Il nome del progetto per i repository.
 * @returns L'URL di anteprima del sito deployato.
 */
export async function deploySite(fileStructure: Record<string, string>, projectName: string): Promise<string> {
    const tempDir = path.join('/tmp', `proj-${Date.now()}`);

    try {
        // 1. Scrivere i file generati in una directory temporanea
        console.log(`Scrittura file in directory temporanea: ${tempDir}`);
        await fs.mkdir(tempDir, { recursive: true });
        for (const filePath in fileStructure) {
            const fullPath = path.join(tempDir, filePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, fileStructure[filePath]);
        }

        // 2. SCUDO DI SICUREZZA: Esegui un audit delle dipendenze
        if (fileStructure['package.json']) {
            console.log("Trovato package.json, avvio audit di sicurezza...");
            
            // Installa le dipendenze per generare il file package-lock.json necessario all'audit
            console.log("Installazione dipendenze in corso...");
            await execAsync('npm install', { cwd: tempDir });
            
            try {
                // Esegui l'audit. Se trova vulnerabilità HIGH o CRITICAL, lancerà un errore.
                console.log("Esecuzione npm audit...");
                await execAsync('npm audit --audit-level=high', { cwd: tempDir });
                console.log("✅ Audit di sicurezza superato.");
            } catch (error) {
                console.error("❌ AUDIT DI SICUREZZA FALLITO:", error.stdout);
                throw new Error("Trovate vulnerabilità critiche. Deploy annullato.");
            }
        }

        // 3. Se l'audit passa, procedi con il deploy
        const previewUrl = await createAndDeployRepo(tempDir, projectName);
        return previewUrl;

    } finally {
        // 4. Pulisci sempre la directory temporanea
        console.log(`Pulizia directory temporanea: ${tempDir}`);
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}


/**
 * Funzione helper per creare il repo GitHub e il progetto Vercel.
 * @param localPath Percorso locale alla directory con il codice sorgente.
 * @param projectName Nome del progetto.
 * @returns L'URL di anteprima del sito deployato.
 */
async function createAndDeployRepo(localPath: string, projectName: string): Promise<string> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // Opzionale se si usa l'account personale

    // Step A: Creare un repository GitHub privato
    console.log(`Creazione repository GitHub 'site-${projectName}'...`);
    const repo = await octokit.repos.createForAuthenticatedUser({
        name: `site-${projectName}`,
        private: true,
    });
    const repoFullName = repo.data.full_name;
    const repoUrl = repo.data.clone_url;
    
    // Step B: Inizializzare git localmente e pushare il codice
    console.log(`Push del codice su ${repoFullName}...`);
    await execAsync('git init', { cwd: localPath });
    await execAsync('git add .', { cwd: localPath });
    await execAsync('git commit -m "Initial commit from AI Wizard"', { cwd: localPath });
    await execAsync(`git remote add origin ${repoUrl}`, { cwd: localPath });
    await execAsync('git branch -M main', { cwd: localPath });
    await execAsync('git push -u origin main', { cwd: localPath });
    
    // Step C: Creare un progetto Vercel
    console.log("Creazione progetto Vercel...");
    const vercelApiUrl = VERCEL_TEAM_ID 
        ? `https://api.vercel.com/v9/projects?teamId=${VERCEL_TEAM_ID}`
        : `https://api.vercel.com/v9/projects`;
        
    const response = await fetch(vercelApiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: `site-${projectName}`,
            framework: 'nextjs',
            gitRepository: { type: 'github', repo: repoFullName },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Errore API Vercel: ${JSON.stringify(error)}`);
    }
    
    const vercelProject = await response.json();
    const previewUrl = `https://${vercelProject.alias[0].domain}`;
    console.log(`✅ Deploy avviato! URL di anteprima: ${previewUrl}`);
    
    return previewUrl;
}