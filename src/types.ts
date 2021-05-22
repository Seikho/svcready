import * as Logger from 'bunyan'
import * as express from 'express'

export type Paging = {
  page: number
  size: number
  offset: number
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
    [key: string]: any
  }
}

export type Token = {
  userId: string
  exp: number
  iat: number
}

export type Handler = (req: ServiceRequest, res: express.Response, next: express.NextFunction) => any

export type Options = {
  port: number
  logging?: boolean
  auth?: AuthConfig
  sockets?: boolean
}

export type AuthConfig = {
  secret: string
  expiryMins?: number
  graceMins?: number
  getUser(userId: string): Promise<User | undefined>
  cookie?: {
    /** */
    maxAgeMins?: number
    secure?: boolean
    sameSite?: 'lax' | 'none' | 'strict' | boolean
  }
}

export type SocketHandler<T = any> = (msg: T) => any
