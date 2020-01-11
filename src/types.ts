import * as Logger from 'bunyan'
import * as express from 'express'

export class StatusError extends Error {
  constructor(public msg: string, public status: number) {
    super(msg)
  }
}

export type User = {
  userId: string
  hash: string
}

export type Token = {
  userId: string
  token: string
}

export interface Request extends express.Request {
  log: Logger
  user?: { userId: string }
}

export type Handler = (
  req: Request,
  res: express.Response,
  next: express.NextFunction
) => Promise<void> | void

export type Options = {
  port: number
  logging?: boolean
  auth?: AuthConfig
}

export type AuthConfig = {
  secret: string
  expiryMins?: number
  getToken(token: string): Promise<Token | undefined>
  saveToken(userId: string, token: string): Promise<Token>
  getUser(userId: string): Promise<User | undefined>
  saveUser(userId: string, password: string): Promise<void>
}
