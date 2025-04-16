import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

declare module 'express' {
  export interface Request {
    user?: {
      id: string
    }
  }
}

const protect = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined')
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string }
    req.user = { id: decoded.id }
    next()
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' })
  }
}

export default protect
