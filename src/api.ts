import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as http from 'http'
import { logMiddleware, logger } from './log'
import { pagingMiddleware } from './paging'
import { ServiceRequest, Options } from './types'
import { createAuth } from './auth'
import { setup } from './socket'

export function create(opts: Options = { port: 3000 }) {
  const app = express()
  const server = http.createServer(app)

  app.use(bodyParser.json(), bodyParser.urlencoded({ extended: true }))
  app.use(logMiddleware)

  const { handler, middleware, createToken } = createAuth(opts.auth)
  app.use(middleware as any)
  app.use(pagingMiddleware)

  const { interval, sockets } = setup(server, opts)

  const start = () => {
    app.get('/healthcheck', (_, res) => res.json('ok'))
    if (opts.auth) {
      app.post('/api/login', handler)
    }

    const promise = new Promise<void>((resolve, reject) => {
      app.use(errorHandler as any)
      server.listen(opts.port, () => {
        logger.info(`api listen on port ${opts.port}`)
        resolve()
      })
    })

    return promise
  }

  const stop = () => {
    if (interval) clearInterval(interval)
    server.close()
  }

  return { app, start, stop, sockets, createToken }
}

function errorHandler(
  err: any,
  req: ServiceRequest,
  res: express.Response,
  _next: express.NextFunction
) {
  const status = typeof err.status === 'number' ? err.status : 500
  if (req.log && status === 500) {
    req.log.error({ err }, 'Unhandled exception')
  }
  if ('code' in err) {
    const code = err.code || 'UNKNOWN'
    res.status(status).send({ message: err.message, code })
    return
  }

  const message = err.status ? err.message : 'Internal server error'

  res.status(status).send({ message })
  return
}
