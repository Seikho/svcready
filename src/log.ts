import { NextFunction, Request, Response } from 'express'
import * as pino from 'pino'
import * as uuid from 'uuid'
import { Options } from './types'

const prettyPrint = process.env.NODE_ENV !== 'production'

export type Logger = pino.Logger

export const logger = pino({
  name: 'app',
  level: getLogLevel(),
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  prettyPrint,
})

export function logMiddleware(opts: Options['logging']) {
  const toRedact = new Set(opts?.redact ?? [])
  const middleware = (req: any, res: Response, next: NextFunction) => {
    if (opts?.prelog) opts.prelog(req)

    const body: any = { ...req.body }

    if (opts?.redact) redact(toRedact, body)

    const log = logger.child({ requestId: uuid.v4(), url: req.url, method: req.method, body })

    req.log = log

    req.log.info('start request')

    const start = Date.now()

    res.on('finish', () => {
      const duration = Date.now() - start
      req.log.info({ duration, statusCode: res.statusCode }, 'end request')
    })

    next()
  }

  return middleware
}

export function createLogger(name: string) {
  const log = logger.child({ name })
  return log
}

function getLogLevel() {
  const level = process.env.LOG_LEVEL || 'info'
  switch (level) {
    case 'fatal':
      return 'fatal'
    case 'error':
      return 'error'
    case 'warn':
      return 'warn'
    case 'info':
      return 'info'
    case 'debug':
      return 'debug'
    case 'trace':
      return 'trace'
  }

  return 'info'
}

function redact(toRedact: Set<string>, body: any) {
  if (!body) return
  if (typeof body !== 'object') return

  for (const key in body) {
    if (toRedact.has(key) && typeof body[key] === 'string') {
      body[key] = '[REDACTED]'
      continue
    }

    redact(toRedact, body[key])
  }
}
