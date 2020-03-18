import * as express from 'express'
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcryptjs'
import { handle } from './handler'
import { StatusError, AuthConfig, ServiceRequest } from './types'

let EXPIRES_MINS = 1440
let SECRET = ''

export function createToken(userId: string) {
  if (SECRET === '') throw new Error('Unable to create token: Secret not set')
  const token = jwt.sign({ userId }, SECRET, { expiresIn: EXPIRES_MINS * 60 })
  return token
}

export function createAuth(config?: AuthConfig) {
  if (!config) {
    return { createToken: (_: string) => '', handler: noop, middleware: noop }
  }

  EXPIRES_MINS = config.expiryMins || 1440
  SECRET = config.secret

  const middleware = (req: ServiceRequest, res: express.Response, next: express.NextFunction) => {
    req.session = {}
    const header = req.header('Authorization')
    if (!header) return next()

    const [prefix, token] = header.split(' ')
    if (prefix !== 'Bearer') {
      return res.status(401).send('Unauthorized')
    }

    try {
      const payload: any = jwt.verify(token, config.secret)
      req.session.userId = payload.userId
      next()
    } catch (_) {
      return res.status(401).send('Unauthorized')
    }
  }

  const handler = handle(async (req, res) => {
    if (!req.body) throw new Error('Invalid request body: No body found')
    const userId: string = req.body.username ?? req.body.userId
    const password: string = req.body.password

    if (!userId || !password) {
      throw new StatusError('Invalid request body: username or password not provided', 400)
    }

    const user = await config.getUser(userId)
    if (!user) {
      throw new StatusError('Invalid username or password', 401)
    }

    const isValid = await compare(password, user.hash)
    if (!isValid) {
      throw new StatusError('Invalid username or password', 401)
    }

    const token = createToken(userId)

    req.session.userId = userId
    res.json({ token })
  })

  const isValidToken = (token: string) => {
    try {
      jwt.verify(token, config.secret)
      return true
    } catch (ex) {
      return false
    }
  }

  return { handler, middleware, isValidToken }
}

const noop: express.RequestHandler = (_, __, next) => next()

export async function encrypt(value: string) {
  const salt = await bcrypt.genSalt(10)
  const hashed = await bcrypt.hash(value, salt)
  return hashed
}

async function compare(input: string, hashed: string) {
  const result = await bcrypt.compare(input, hashed)
  return result
}
