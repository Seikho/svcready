import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as http from 'http'
import { logMiddleware, logger } from './log'
import { Request, Options, StatusError } from './types'
import { createAuth, encrypt } from './auth'
import { setup } from './socket'

export function create(opts: Options = { port: 3000 }) {
  const app = express()
  const server = http.createServer(app)

  app.use(bodyParser.json(), bodyParser.urlencoded({ extended: true }))

  if (opts.logging !== false) {
    app.use(logMiddleware)
  }

  let session: express.RequestHandler | undefined
  if (opts.auth) {
    const { handler, middleware } = createAuth(opts.auth)
    session = middleware
    app.use(middleware)
    app.post('/api/login', handler)
    app.get('/healthcheck', (_, res) => res.json('ok'))
  }

  const { interval, sockets } = setup(server, opts.sockets, session)

  const start = () => {
    const promise = new Promise<void>((resolve, reject) => {
      app.use(errorHandler as any)
      app.listen(opts.port, err => {
        if (err) return reject(new Error(`Failed to start server: ${err}`))
        logger.info(`api listen on port ${opts.port}`)
        resolve()
      })
    })

    return promise
  }

  const stop = () => {
    clearInterval(interval)
    server.close()
  }

  return { app, start, stop, sockets }
}

function errorHandler(err: any, req: Request, res: express.Response, _next: express.NextFunction) {
  const status = typeof err.status === 'number' ? err.status : 500
  if ('code' in err) {
    const code = err.code || 'UNKNOWN'
    res.status(status).send({ message: err.message, code })
    return
  }

  const message = err.status ? err.message : 'Internal server error'
  if (req.log) {
    req.log.error({ err }, 'Unhandled exception')
  }

  res.status(err.status).send({ message })
  return
}
