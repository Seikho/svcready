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
  expires: Date
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
