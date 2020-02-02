import { NextFunction } from 'express'

export const MAX_PAGE_SIZE = 100

export const pagingMiddleware = (req: any, _: any, next: NextFunction) => {
  const page = req.query.page
  let size = req.query.size

  if (page === undefined && size === undefined) {
    next()
    return
  }

  if (size === undefined) {
    size = 20
  }

  if (size > MAX_PAGE_SIZE) {
    size = MAX_PAGE_SIZE
  }

  if (size < 1) {
    size = 1
  }

  req.paging = {
    page: page ?? 1,
    size: size,
  }

  next()
}
