import { Request, Response, NextFunction } from 'express'

const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
       res
        .status(403)
        .json({
          success: false,
          message: 'Access denied: insufficient permissions',
        })
        return
    }
    next()
  }
}

export default authorizeRoles
