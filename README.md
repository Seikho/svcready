# svcready

> Service Ready: An opinionated Node.JS starter with Express, logging, and authenication

## Why

Each time I create a new API I generally end up re-implementing logging, error handling, and authentication.

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
import { Router } from 'express'
import * as auth from './my-auth'
import { someRouter } from './some-feature'
import { otherRouter } from './other-feature'
import { users } from './users'

const { app, start } = create({
  // JWT token expiry
  expiryMins: 60,

  // Express API port
  port: 3000,

  // Auth will only be provided if this config is provided
  auth: {
    // (token: string) => Promise<Token | undefined>
    getToken: auth.getToken,

    // (userId: string, token: string) => Promise<void>
    createToken: auth.createToken,

    // (userId: string) => Promise<User | undefined>
    getUser: auth.getUser,

    // (userId: string, hash: string) => Promise<void>
    saveUser: auth.saveUser,
  },
})

const routes = Router()

routes.use('/some', someRouter)
routes.use('/other', otherRouter)
routes.use('/users', users)

app.use('/api', routes)

start()
  .then(() => logger.info('service ready'))
  .catch(ex => {
    logger.error({ ex }, 'service failed to start')
    process.exit(-1)
  })

// ./users
import { Router } from 'express'
import { handle, createUser } from 'svcready'

const router = Router()

// Would normally be defined in another module
const register = handle(async (req, res) => {
  // Validate body...
  // Verify user id is available...
  const { username, password } = req.body
  const token = await createUser(username, password)
  res.json({ token })
})

router.post('/register', register)
```
