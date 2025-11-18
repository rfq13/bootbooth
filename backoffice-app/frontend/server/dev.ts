import { createServer } from 'vite'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

async function start() {
  const PORT = Number(process.env.PORT || 5180)
  const HMR_PORT = PORT + 1
  const vite = await createServer({ server: { middlewareMode: true, port: PORT, hmr: { port: HMR_PORT } } })
  const server = http.createServer((req, res) => {
    vite.middlewares(req, res)
  })
  server.listen(PORT)
}

start()