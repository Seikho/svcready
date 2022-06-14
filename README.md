# svcready

> Service Ready: An opinionated Node.JS starter with Express, logging, and authenication

## Why

Each time I create a new API I generally end up re-implementing logging, error handling, websockets, and authentication.  
I created this library to avoid having to solve these problems each time.

## Installation

```bash
> yarn add svcready
> npm i svcready
```

## Getting Started

```ts
import { create, logger } from 'svcready'

/**
 * These are functions implemented by you that create and get users and tokens
 * from your database.
 *
 * See the type definitions for their signatures
 */
import * as auth from './my-auth'
import { Router } from 'express'
import { someRouter } from './some-feature'
import { otherRouter } from './other-feature'
import { users } from './users'

/**
 * app: Express app
 * sockets: WebSocket server
 * - Sockets are authenticated on "upgrade"
 * - If the web client has an authenticated session, the socket will be authenticated on connection
 * - Reconnect them on the client after successfully authenticating to authenticate
 * - Use sockets.on('message', ...) to handle incoming messages
 * start: starts the HTTP server
 * stop: stops the HTTP server and websocket heartbeats
 */

const { app, sockets, start, stop } = create({
  // Express API port
  port: 3000,

  // Auth will only be provided if this config is provided
  auth: {
    // Session expiry in minutes
    expiryMins: 60,

    // Secret used for sessions
    secret: process.env.APP_SECRET,

    // (userId: string) => Promise<User | undefined>
    getUser: auth.getUser,
  },
  logging: {
    enabled: true,

    // Redact secrets before logging
    redact: ['password', 'accessToken'],
  },
})

const routes = Router()

routes.use('/some', someRouter)
routes.use('/other', otherRouter)
routes.use('/users', users)

app.use('/api', routes)

start()
  .then(() => logger.info('service ready'))
  .catch((ex) => {
    logger.error({ ex }, 'service failed to start')
    process.exit(-1)
  })

// ./users
import { Router } from 'express'
import { handle } from 'svcready'
import { createUser } from '../my-db/create-user'

const router = Router()

// Would normally be defined in another module
const register = handle(async (req, res) => {
  // Validate body...
  // Verify user id is available...
  const { username, password } = req.body

  const hash = await encrypt(password)

  // Creates a secure password hash and persists it
  await createUser(username, hash)
  res.json({ success: true })
})

router.post('/register', register)
```
