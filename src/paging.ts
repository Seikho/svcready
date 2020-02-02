import { NextFunction } from 'express'

export const MAX_PAGE_SIZE = 100

export const pagingMiddleware = (req: any, _: any, next: NextFunction) => {
  let page = req.query.page
  let size = req.query.size

  if (size === undefined || isNaN(size)) {
    size = 20
  }

  if (size > MAX_PAGE_SIZE) {
    size = MAX_PAGE_SIZE
  }

  if (size < 1) {
    size = 1
  }

  if (isNaN(page) || page < 1) {
    page = 1
  }

  req.paging = {
    page: page ?? 1,
    size: size,
  }

  next()
}
