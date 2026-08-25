import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import User from '../models/User.model' 
import { UserRole } from '../interfaces/User.interface'


declare module 'express' {
  export interface Request {
    user?: {
      id: string
      role: UserRole
    }
  }
}

const protect = async (
  req: Request & { user?: { id: string; role: UserRole } },
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' })
    return
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string }

    const user = await User.findById(decoded.id).select('role')
    if (!user) {
      res.status(401).json({ message: 'User not found' })
      return
    }

    req.user = { id: decoded.id, role: user.role as UserRole }

    next()
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' })
  }
}
export default protect
