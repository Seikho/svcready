import * as http from 'http'
import * as ws from 'ws'
import { validateHeader, isExpired } from './auth'
import type { Options, Token } from './types'

export interface SvcSocket extends ws {
  isAlive: boolean
  userId?: string
  token?: Token | null
  data: { [key: string]: any }
}

type Handler<T> = (client: SvcSocket, event: Message<T>) => Promise<void> | void

type Message<T> = T & { type: string }

export function setup(app: http.Server, opts: Options) {
  const sockets = new ws.Server({ server: app, path: '/ws' })
  const clients = sockets.clients as Set<SvcSocket>

  const interval = check(sockets)

  let connectHandler = (_client: SvcSocket) => {
    // NOOP
  }

  if (opts.sockets === false) {
    clearInterval(interval)
    return { sockets, interval, onMsg: noopOnMsg, sendMsg: noopSendMsg, onConnect }
  }

  const handlers: { [type: string]: Handler<any> } = {
    _login: (client, event: Message<{ token: string }>) => {
      try {
        const token = validateHeader(`Bearer ${event.token}`)
        client.userId = token?.userId ?? token?.sub
        client.token = token
        send(client, { type: 'auth', success: true })
        handlers.login?.(client, event)
      } catch (ex) {
        send(client, { type: 'auth', error: 'Authentication failed', success: false })
      }
    },
    _logout: (client) => {
      client.userId = undefined
      handlers.logout?.(client, event)
    },
    ping: (client) => {
      send(client, { type: 'pong' })
    },
  }

  sockets.on('connection', (client: SvcSocket) => {
    client.data = {}
    client.on('pong', heartbeat)
    client.on('message', (data) => {
      try {
        const obj = JSON.parse(data.toString())
        if (obj.type === undefined) return

        const handler = handlers[`_${obj.type}`] || handlers[obj.type]
        if (handler === undefined) return

        if (client.token && isExpired(client.token)) {
          client.userId = undefined
          client.token = undefined
        }

        handler(client, obj)
      } catch (ex) {}
    })
    connectHandler(client)
  })

  function onMsg<T extends { type: string }>(type: string, handler: Handler<T>) {
    if (handlers[type] !== undefined) {
      throw new Error(`Sockets: Already registered handler for type '${type}'`)
    }

    if (handlers[`_${type}`] !== undefined) {
      throw new Error(`Sockets: Cannot override reserved socket handler for type '${type}'`)
    }

    handlers[type] = handler
  }

  function onConnect(handler: (client: SvcSocket) => void) {
    connectHandler = handler
  }

  function sendMsg(data: any, userId?: string) {
    const payload = JSON.stringify(data)
    for (const client of clients) {
      if (userId === undefined) {
        client.send(payload)
        continue
      }

      if (client.userId === userId) {
        client.send(payload)
      }
    }
  }

  return { sockets, interval, onMsg, sendMsg, onConnect }
}

function send(client: SvcSocket, data: object) {
  client.send(JSON.stringify(data))
}

function heartbeat(client: SvcSocket) {
  client.isAlive = true
}

function check(server: ws.Server) {
  const interval = setInterval(() => {
    const clients = server.clients as Set<SvcSocket>
    for (const client of clients) {
      if (client.isAlive === false) {
        client.terminate()
        return
      }

      client.isAlive = false
      client.ping(() => {
        client.isAlive = true
      })
    }
  }, 30000)
  return interval
}

function noopOnMsg(_type: string, _handler: Handler<any>) {}

function noopSendMsg(_data: any, _userId?: string) {}
