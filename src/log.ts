import { NextFunction, Response } from 'express'
import * as bunyan from 'bunyan'
import * as uuid from 'uuid'
const PrettyStream = require('bunyan-prettystream')

const pretty = new PrettyStream()
pretty.pipe(process.stdout)

const logStream = process.env.NODE_ENV === 'production' ? process.stdout : pretty

export type Logger = bunyan

export const logger = bunyan.createLogger({
  name: 'app',
  level: getLogLevel(),
  serializers: {
    err: bunyan.stdSerializers.err,
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
  },
  stream: logStream,
})

export function logMiddleware(req: any, res: Response, next: NextFunction) {
  const log = logger.child({})
  log.fields.requestId = uuid.v4()
  log.fields.req = {
    url: req.url,
    method: req.method,
    // Must be a new reference to prevent mutation below
    body: { ...req.body },
  }

  if ('password' in log.fields.req.body) {
    log.fields.req.body.password = '[REDACTED]'
  }

  req.log = log

  req.log.info('start request')
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    log.fields.duration = duration
    log.fields.res = {
      statusCode: res.statusCode,
    }
    req.log.info('end request')
  })

  next()
}

export function createLogger(name: string) {
  const log = logger.child({})
  logger.fields.name = name

  return log
}

function getLogLevel(): number {
  const level = process.env.LOG_LEVEL || 'info'
  switch (level) {
    case 'fatal':
      return 60
    case 'error':
      return 50
    case 'warn':
      return 40
    case 'info':
      return 30
    case 'debug':
      return 20
    case 'trace':
      return 10
  }

  return 30
}
