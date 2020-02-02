import * as Logger from 'bunyan'
import * as express from 'express'

export type Paging = {
  page: number
  size: number
}

export class StatusError extends Error {
  constructor(public msg: string, public status: number) {
    super(msg)
  }
}

export type User = {
  userId: string
  hash: string
}

export type ServiceRequest = express.Request & {
  paging: Paging
  log: Logger
  session: {
    userId?: string
  }
}

export type Token = {
  userId: string
  exp: number
  iat: number
}

export type Handler = (
  req: ServiceRequest,
  res: express.Response,
  next: express.NextFunction
) => any

export type Options = {
  port: number
  logging?: boolean
  auth?: AuthConfig
  sockets?: boolean
}

export type AuthConfig = {
  secret: string
  expiryMins?: number
  getUser(userId: string): Promise<User | undefined>
}

export type SocketHandler<T = any> = (msg: T) => any
