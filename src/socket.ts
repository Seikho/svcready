import * as http from 'http'
import * as ws from 'ws'
import * as express from 'express'
import * as url from 'url'
import { Options } from './types'

type Client = ws & { isAlive: boolean }

export function setup(app: http.Server, opts: Options, session?: express.RequestHandler) {
  const sockets = new ws.Server({ noServer: true })

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

  if (!session) {
    return { sockets, interval }
  }

  app.on('upgrade', (req, socket, head) => {
    const pathname = url.parse(req.url).pathname
    if (pathname !== '/ws') {
      socket.destroy()
      return
    }
    session(req, {} as any, () => {
      if (req.session.userId) {
        socket.userId = req.session.userId
        return
      }
    })

    sockets.handleUpgrade(req, socket, head, ws => {
      sockets.emit('connection', ws, req)
    })
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
  client.ping(noop)
}

function noop() {}
