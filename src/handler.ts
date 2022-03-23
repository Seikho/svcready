import * as express from 'express'
import { Handler } from './types'

export function handle(handler: Handler) {
  const wrapped: express.RequestHandler = async (req, res, next) => {
    let nextCalled = false
    const wrappedNext = (err?: any) => {
      nextCalled = true
      next(err)
    }

    try {
      const result = await handler(req as any, res, wrappedNext)
      if (!res.headersSent && !nextCalled) {
        res.json(result)
      }
    } catch (ex) {
      next(ex)
    }
  }
  return wrapped
}

export const wrap = handle
