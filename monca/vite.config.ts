import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import path from 'node:path'

const POKECABOOK_ARCHIVES_REGEX = /^https:\/\/pokecabook\.com\/archives\/\d+\/?$/

function readJsonBody(req: import('node:http').IncomingMessage): Promise<{ url?: string }> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    {
      name: 'deck-data-update-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url !== '/api/update-deck-data' || req.method !== 'POST') {
            return next()
          }
          res.setHeader('Content-Type', 'application/json')
          try {
            const body = await readJsonBody(req)
            const url = (body?.url ?? '').trim()
            const sourceUrl = url || 'https://pokecabook.com/archives/122503'
            if (url && !POKECABOOK_ARCHIVES_REGEX.test(sourceUrl)) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: '無効なURLです。https://pokecabook.com/archives/〇〇〇 の形式で入力してください。' }))
            }
            const cwd = process.cwd()
            const scriptPath = path.join(cwd, 'scripts', 'scrape-decks.ts')
            const child = spawn('npx', ['tsx', scriptPath], {
              cwd,
              env: { ...process.env, SOURCE_URL: sourceUrl, OUTPUT_STDOUT: '1' },
              stdio: ['ignore', 'pipe', 'pipe'],
            })
            let stdout = ''
            let stderr = ''
            child.stdout?.on('data', (d) => { stdout += d.toString() })
            child.stderr?.on('data', (d) => { stderr += d.toString() })
            child.on('close', (code) => {
              if (code === 0) {
                try {
                  const data = JSON.parse(stdout)
                  res.statusCode = 200
                  res.end(JSON.stringify({ ok: true, data }))
                } catch {
                  res.statusCode = 502
                  res.end(JSON.stringify({ error: 'スクレイプ結果の取得に失敗しました' }))
                }
              } else {
                res.statusCode = 502
                res.end(JSON.stringify({ error: stderr || `スクレイプが失敗しました (code ${code})` }))
              }
            })
            child.on('error', (err) => {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            })
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : '不明なエラー' }))
          }
        })
      },
    },
  ],
})
