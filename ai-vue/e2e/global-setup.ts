import { createRequire } from 'node:module'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const { startMockServer } = require('./mock-server.cjs')

export default async function globalSetup() {
  const mockServer = await startMockServer(3000)
  const viteServer = await createServer({
    server: { host: '127.0.0.1', port: 4173 }
  })
  await viteServer.listen()

  return async () => {
    await viteServer.close()
    await mockServer.close()
  }
}
