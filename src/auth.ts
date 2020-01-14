import * as express from 'express'
import * as sessionParser from 'express-session'
import * as bcrypt from 'bcrypt'
import { handle } from './handler'
import { StatusError, AuthConfig } from './types'

export function createAuth(config?: AuthConfig) {
  if (!config) {
    return { handler: noop, middleware: noop }
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

    req.session.userId = userId
    res.json({ userId })
  })

  const expiry = config.expiryMins || 1440

  const middleware = sessionParser({
    secret: config.secret,
    cookie: { secure: true, maxAge: expiry * 60000, httpOnly: true },
    resave: false,
    saveUninitialized: true,
  })

  return { handler, middleware }
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
