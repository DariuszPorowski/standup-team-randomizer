import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

await import('./build.mjs')

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const preferredPort = Number.parseInt(process.env.PORT ?? '4173', 10)
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
])

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost')
  const requestedPath = normalize(decodeURIComponent(requestUrl.pathname)).replace(/^([/\\])+/, '')
  let filePath = join(root, requestedPath)

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    filePath = join(root, 'index.html')
  } else if ((await stat(filePath)).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }

  response.setHeader('Content-Type', contentTypes.get(extname(filePath)) ?? 'application/octet-stream')
  response.setHeader('Cache-Control', 'no-store')
  createReadStream(filePath)
    .on('error', () => {
      response.statusCode = 500
      response.end('Unable to read the requested file')
    })
    .pipe(response)
})

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < preferredPort + 20) {
      listen(port + 1)
      return
    }

    throw error
  })
  server.listen(port, '127.0.0.1', () => {
    console.log(`Standup randomizer: http://127.0.0.1:${port}`)
  })
}

listen(preferredPort)
