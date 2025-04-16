import User from '../models/User.model'
import sendEmail from '../utils/email'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Request, Response } from 'express'

// User Registration
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phoneNumber, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User already exists' })
      return
    }

    const verificationCode = crypto.randomBytes(3).toString('hex')

    const newUser = new User({
      name,
      email,
      phoneNumber,
      password,
      verificationCode,
    })

    await newUser.save()

    await sendEmail(
      email,
      'Verify Your Email',
      `Your verification code is: ${verificationCode}`
    )

    res.status(201).json({
      success: true,
      message: 'User registered. Please verify your email.',
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}

// User Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid email or password' })
      return
    }

    const isMatch = password === user.password
    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid email or password' })
      return
    }

    if (!user.isVerified) {
      res
        .status(400)
        .json({ success: false, message: 'Please verify your email first' })
      return
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: '50h',
    })

    res.status(200).json({ success: true, token: token })
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      })
  }
}

// Forgot Password
export const forgotPassword = async (req: Request, res: Response):Promise<void> => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
       res.status(400).json({ message: 'User not found' })
       return
    }

    const resetToken = crypto.randomBytes(20).toString('hex')
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = new Date(Date.now() + 3600000)

    await user.save()

    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/reset-password/${resetToken}`
    await sendEmail(
      email,
      'Password Reset Request',
      `You requested a password reset. Click the link to reset your password: ${resetUrl}`
    )

    res.status(200).json({ message: 'Password reset email sent' })
  } catch (error: unknown) {
    res.status(500).json({
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}
