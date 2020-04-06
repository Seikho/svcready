import * as express from 'express'
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcryptjs'
import { handle } from './handler'
import { StatusError, AuthConfig, ServiceRequest, Token } from './types'

let EXPIRES_MINS = 1440
let GRACE_MINS = 0
let SECRET = ''

export function createToken(userId: string) {
  if (SECRET === '') throw new Error('Unable to create token: Secret not set')
  const token = jwt.sign({ userId }, SECRET, { expiresIn: EXPIRES_MINS * 60 })
  return token
}

export function createAuth(config?: AuthConfig) {
  if (!config) {
    return { validateToken: (_: string) => null, loginHandler: noop, middleware: noop }
  }

  EXPIRES_MINS = config.expiryMins || 1440
  GRACE_MINS = config.graceMins || 0
  SECRET = config.secret

  const middleware = (req: ServiceRequest, res: express.Response, next: express.NextFunction) => {
    req.session = {}
    const header = req.header('Authorization')
    if (!header) return next()

    const token = validateHeader(header, config.secret)
    if (!token) return res.status(401).send('Unauthorized')
    req.session.userId = token.userId
    next()
  }

  const validateToken = (token: string): Token | null => {
    try {
      const payload = jwt.verify(token, config.secret) as Token
      if (typeof payload === 'string') return null

      const expires = payload.exp * 1000
      if (expires < Date.now()) return null

      return payload
    } catch (ex) {
      return null
    }
  }

  const loginHandler = handle(async (req, res) => {
    const auth = validateHeader(req.header('Authorization'), config.secret, GRACE_MINS)
    if (auth) {
      const token = createToken(auth.userId)
      res.json({ token })
      return
    }

    if (!req.body) {
      throw new StatusError('Invalid request body: username and password not provided', 400)
    }

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

  return { loginHandler, middleware, validateToken }
}

const noop: express.RequestHandler = (_, __, next) => next()

function validateHeader(
  header: string | undefined,
  secret: string,
  graceMins?: number
): Token | null {
  if (!header) return null

  const [prefix, token] = header.split(' ')
  if (prefix !== 'Bearer') return null

  try {
    const payload = jwt.verify(token, secret) as Token
    if (typeof payload === 'string') return null

    const expires = payload.exp * 1000
    if (expires < Date.now()) {
      if (!graceMins) return null

      const expiredAgoMins = (Date.now() - expires) / 60000
      if (expiredAgoMins > GRACE_MINS) return null
    }

    return payload
  } catch (ex) {
    return null
  }
}

export async function encrypt(value: string) {
  const salt = await bcrypt.genSalt(10)
  const hashed = await bcrypt.hash(value, salt)
  return hashed
}

async function compare(input: string, hashed: string) {
  const result = await bcrypt.compare(input, hashed)
  return result
}
