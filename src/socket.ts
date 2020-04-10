import * as http from 'http'
import * as ws from 'ws'
import { validateHeader, isExpired } from './auth'
import type { Options, Token } from './types'

type Client = ws & { isAlive: boolean; userId?: string; token?: Token | null }

type Handler<T> = (client: Client, event: Message<T>) => Promise<void> | void

type Message<T> = T & { type: string }

export function setup(app: http.Server, opts: Options) {
  const sockets = new ws.Server({ server: app, path: '/ws' })
  const clients = sockets.clients as Set<Client>

  const interval = check(sockets)

  if (opts.sockets === false) {
    clearInterval(interval)
    return { sockets, interval, onMsg: noopOnMsg, sendMsg: noopSendMsg }
  }

  const handlers: { [type: string]: Handler<any> } = {
    login: (client, event: Message<{ token: string }>) => {
      try {
        const token = validateHeader(event.token)
        client.userId = token?.userId
        client.token = token
        send(client, { type: 'auth', success: true })
      } catch (ex) {
        send(client, { type: 'auth', error: 'Authentication failed', success: false })
      }
    },
    logout: (client) => {
      client.userId = undefined
    },
  }

  sockets.on('connection', (client: Client) => {
    client.on('pong', heartbeat)
    client.on('message', (data) => {
      try {
        const obj = JSON.parse(data.toString())
        if (obj.type === undefined) return
        if (handlers[obj.type] === undefined) return

        if (client.token && isExpired(client.token)) {
          client.userId = undefined
          client.token = undefined
        }

        handlers[obj.type](client, obj)
      } catch (ex) {}
    })
  })

  function onMsg<T extends { type: string }>(type: string, handler: Handler<T>) {
    if (handlers[type] !== undefined) {
      throw new Error(`Sockets: Already registered handler for type '${type}'`)
    }

    handlers[type] = handler
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

  return { sockets, interval, onMsg, sendMsg }
}

function send(client: Client, data: object) {
  client.send(JSON.stringify(data))
}

function heartbeat(client: Client) {
  client.isAlive = true
}

function check(server: ws.Server) {
  const interval = setInterval(() => {
    const clients = server.clients as Set<Client>
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

function noop() {}

function noopOnMsg(_type: string, _handler: Handler<any>) {}

function noopSendMsg(_data: any, _userId?: string) {}
