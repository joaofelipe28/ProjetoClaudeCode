import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { promises as fs } from 'fs'

// ── Persistência em arquivo no disco ────────────────────────────────────────
// Os dados ficam em painel-financeiro-data.json (ao lado do package.json).
// A cada gravação, também é criado um backup datado em backups/.
// Isso torna os dados INDEPENDENTES da porta e do navegador, e à prova de
// limpeza de cache. Nunca mais perde dado por trocar de porta/navegador.

const DATA_FILE = path.resolve(__dirname, 'painel-financeiro-data.json')
const BACKUP_DIR = path.resolve(__dirname, 'backups')
let writeQueue: Promise<void> = Promise.resolve()

async function writeWithBackup(body: string) {
  // 1) grava o arquivo principal
  await fs.writeFile(DATA_FILE, body, 'utf-8')
  // 2) cria/atualiza backup do dia
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  await fs.writeFile(path.join(BACKUP_DIR, `backup-${today}.json`), body, 'utf-8')
  // 3) mantém só os 30 backups mais recentes
  try {
    const files = (await fs.readdir(BACKUP_DIR))
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
    const excedentes = files.slice(0, Math.max(0, files.length - 30))
    await Promise.all(excedentes.map(f => fs.unlink(path.join(BACKUP_DIR, f))))
  } catch { /* limpeza best-effort */ }
}

function localDataPlugin(): Plugin {
  return {
    name: 'local-data-api',
    configureServer(server) {
      server.middlewares.use('/api/data', async (req, res, next) => {
        if (req.url !== '/' && req.url !== '') return next()
        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'GET') {
          try {
            res.end(await fs.readFile(DATA_FILE, 'utf-8'))
          } catch (e: unknown) {
            if ((e as NodeJS.ErrnoException).code === 'ENOENT') res.end('{}')
            else { res.statusCode = 500; res.end('{"error":"read failed"}') }
          }
          return
        }

        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8')
            try { JSON.parse(body) } catch {
              res.statusCode = 400; res.end('{"error":"invalid JSON"}'); return
            }
            writeQueue = writeQueue.then(() => writeWithBackup(body))
            writeQueue
              .then(() => res.end('{"ok":true}'))
              .catch(() => { res.statusCode = 500; res.end('{"error":"write failed"}') })
          })
          return
        }

        res.statusCode = 405
        res.end('{"error":"method not allowed"}')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localDataPlugin()],
  server: { port: 5174 },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
