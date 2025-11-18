import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve(process.cwd(), 'dist')
let template = ''
try { template = fs.readFileSync(path.resolve(distDir, 'index.html'), 'utf-8') } catch {}
const { render } = await import(path.resolve(process.cwd(), 'dist-ssr/entry-server.js'))

const server = http.createServer(async (req, res) => {
  const url = req.url || '/'
  if (url.startsWith('/assets/')) {
    const filePath = path.resolve(distDir, '.' + url)
    try {
      const buf = fs.readFileSync(filePath)
      const ext = path.extname(filePath)
      const type = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream'
      res.setHeader('Content-Type', type)
      res.end(buf)
      return
    } catch {}
  }
  if (!template) {
    const assetsDir = path.resolve(distDir, 'assets')
    const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : []
    const js = files.find(f => /^index-.*\.js$/.test(f)) || files.find(f => f.endsWith('.js')) || ''
    const cssFiles = files.filter(f => f.endsWith('.css'))
    const cssLinks = cssFiles.map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('')
    template = `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>${cssLinks}</head><body><div id="app"></div>${js ? `<script type="module" src="/assets/${js}"></script>` : ''}</body></html>`
  }
  const appHtml = render(url)
  const html = template.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`)
  res.setHeader('Content-Type', 'text/html')
  res.end(html)
})

server.listen(8080)