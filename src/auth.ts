import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import { AuthConfig } from './api'
import { handle } from './handler'
import { StatusError } from './types'

export function createAuth(config: AuthConfig) {
  const handler = handle(async (req, res) => {
    if (!req.body) throw new Error('Invalid request body: No body found')
    const userId: string = req.body.username ?? req.body.userId
    const password: string = req.body.password

    if (!userId || !password) {
      throw new Error('Invalid request body: username or password not provided')
    }

    const user = await config.getUser(userId)
    if (!user) {
      throw new StatusError('Invalid username or password', 401)
    }

    const isValid = await compare(password, user.hash)
    if (!isValid) {
      throw new StatusError('Invalid username or password', 401)
    }

    const token = await config.createToken(userId)
    res.json(token)
  })

  const middleware = handle(async (req, _res, next) => {
    const bearer = req.header('Authorization')
    if (!bearer) {
      next()
      return
    }

    const [prefix, token] = bearer.split(' ')
    if (prefix !== 'Bearer' || !token) {
      throw new StatusError('Unauthorized', 401)
    }

    const result = await config.getToken(token)
    if (!result) {
      throw new StatusError('Unauthorized', 401)
    }

    req.user = { userId: result.userId }
    next()
  })

  return { handler, middleware }
}

const salt = getSalt()

async function encrypt(value: string) {
  const hashed = await bcrypt.hash(value, await salt)
  return hashed
}

async function compare(input: string, hashed: string) {
  const result = await bcrypt.compare(input, hashed)
  return result
}

async function getSalt() {
  const salt = await bcrypt.genSalt(10)
  return salt
}

const ONE_MIN_MS = 60000

async function createToken(userId: string, cfg: AuthConfig) {
  const expiry = cfg.expiryMins || 1440
  const expires = Date.now() + ONE_MIN_MS * expiry
  const user = await cfg.getUser(userId)

  if (!user) {
    throw new Error('User not found')
  }

  const payload = {
    expires,
    userId,
  }

  const expiresIn = (ONE_MIN_MS * expiry) / 1000
  const token = jwt.sign(payload, cfg.secret, { expiresIn })
  return token
}
