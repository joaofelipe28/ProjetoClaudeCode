import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { promises as fs } from 'fs'

const DATA_FILE = path.resolve(__dirname, 'painel-financeiro-data.json')
let writeQueue: Promise<void> = Promise.resolve()

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
            writeQueue = writeQueue.then(() => fs.writeFile(DATA_FILE, body, 'utf-8'))
            writeQueue
              .then(() => res.end('{"ok":true}'))
              .catch(() => { res.statusCode = 500; res.end('{"error":"write failed"}') })
          })
          return
        }

        res.statusCode = 405; res.end('{"error":"method not allowed"}')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localDataPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
