import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const VLR_API = 'https://vlrggapi.vercel.app'

// Dev middleware: handle /api/proxy?path=... (same format as Vercel serverless)
function proxyApiPlugin() {
  return {
    name: 'proxy-api',
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || !req.url?.startsWith('/api/proxy')) return next()
        const url = new URL(req.url, 'http://localhost')
        const path = url.searchParams.get('path')
        if (!path) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing path query parameter' }))
          return
        }
        const rest = url.searchParams
        rest.delete('path')
        const qs = rest.toString()
        const target = `${VLR_API}/${path}${qs ? `?${qs}` : ''}`
        fetch(target, { headers: { Accept: 'application/json' } })
          .then((r) => {
            res.statusCode = r.status
            r.headers.forEach((v, k) => res.setHeader(k, v))
            return r.text()
          })
          .then((body) => res.end(body))
          .catch((err) => {
            console.error('Proxy error:', err)
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Failed to fetch from API' }))
          })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), proxyApiPlugin()],
})
