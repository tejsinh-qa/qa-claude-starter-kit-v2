import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type PreviewServer, type ViteDevServer } from 'vite'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const loginFixture = path.join(repoRoot, 'demo', 'app', 'login.html')

function loginHandler(req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next()
    return
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (req.method === 'HEAD') {
    res.statusCode = 200
    res.end()
    return
  }
  fs.createReadStream(loginFixture).pipe(res)
}

function waitForPort(port: number) {
  const started = Date.now()
  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' })
      socket.once('connect', () => {
        socket.end()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - started > 8000) reject(new Error('Terminal server did not start'))
        else setTimeout(attempt, 100)
      })
    }
    attempt()
  })
}

function ptyServer() {
  let child: ChildProcess | undefined
  const showcaseRoot = path.dirname(fileURLToPath(import.meta.url))
  return {
    name: 'pty-server',
    async configureServer(server: ViteDevServer) {
      if (child) return
      child = spawn(process.execPath, [path.join(showcaseRoot, 'server', 'pty.mjs')], {
        cwd: showcaseRoot,
        stdio: 'inherit',
        env: process.env,
      })
      await waitForPort(5174)
      const stop = () => {
        if (child && !child.killed) child.kill()
      }
      server.httpServer?.once('close', stop)
    },
  }
}

function serveLoginFixture() {
  return {
    name: 'serve-login-fixture',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/fixture/login.html', loginHandler)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/fixture/login.html', loginHandler)
    },
  }
}

export default defineConfig({
  plugins: [react(), serveLoginFixture(), ptyServer()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5174',
      '/pty': { target: 'ws://127.0.0.1:5174', ws: true },
    },
  },
})
