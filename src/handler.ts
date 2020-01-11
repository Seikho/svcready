import * as express from 'express'
import { Handler } from './types'

export function handle(handler: Handler) {
  const wrapped: express.RequestHandler = async (req, res, next) => {
    try {
      await handler(req as any, res, next)
    } catch (ex) {
      next(ex)
    }
  }
  return wrapped
}
