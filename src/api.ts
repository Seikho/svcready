import * as express from 'express'
import { logMiddleware, logger } from './log'
import { Request, Options, StatusError } from './types'
import { createAuth, encrypt, createToken } from './auth'
import * as bodyParser from 'body-parser'

export function create(opts: Options = { port: 3000 }) {
  const app = express()
  app.use(bodyParser.json(), bodyParser.urlencoded({ extended: true }))

  if (opts.logging !== false) {
    app.use(logMiddleware)
  }

  if (opts.auth) {
    const { handler, middleware } = createAuth(opts.auth)
    app.use(middleware)
    app.post('/api/login', handler)
    app.get('/healthcheck', (_, res) => res.json('ok'))
  }

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

  const createUser = async (userId: string, password: string) => {
    if (!opts.auth) {
      throw new StatusError(`Unable to create user: Auth not enabled`, 500)
    }

    const hash = await encrypt(password)
    await opts.auth?.saveUser(userId, hash)
    const token = await createToken(userId, opts.auth)
    return token
  }

  return { app, start, createUser }
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
