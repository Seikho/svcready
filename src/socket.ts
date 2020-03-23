import * as http from 'http'
import * as ws from 'ws'
import { Options } from './types'

type Client = ws & { isAlive: boolean }

export function setup(app: http.Server, opts: Options) {
  const sockets = new ws.Server({ server: app, path: '/ws' })

  const interval = setInterval(() => {
    for (const client of sockets.clients) {
      check(client as any)
    }
  }, 30000)

  if (opts.sockets === false) {
    clearInterval(interval)
    return { sockets, interval }
  }

  sockets.on('connection', client => {
    client.on('pong', heartbeat)
  })

  return { sockets, interval }
}

function heartbeat(client: Client) {
  client.isAlive = true
}

function check(client: Client) {
  if (client.isAlive === false) {
    client.terminate()
    return
  }

  client.isAlive = false
  client.ping(() => {
    client.isAlive = true
  })
}

function noop() {}
