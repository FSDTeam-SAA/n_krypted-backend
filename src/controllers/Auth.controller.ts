import User from '../models/User.model'
import sendEmail from '../utils/email'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import cloudinary from '../utils/cloudinary'


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

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
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

    const isMatch = await bcrypt.compare(password, user.password)
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

    res.status(200).json({ success: true, data: user, token: token })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}

// Forgot Password
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    // Always respond with success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        message: 'If that email is registered, a reset link has been sent.',
      })
      return
    }

    const resetToken = crypto.randomBytes(20).toString('hex')
    const resetTokenHash = await bcrypt.hash(resetToken, 10)
    user.resetPasswordToken = resetTokenHash
    user.resetPasswordExpires = new Date(Date.now() + 3600000)

    await user.save()

    // Use a frontend URL for reset
    const resetUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:3000'
    }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
    await sendEmail(
      email,
      'Password Reset Request',
      `You requested a password reset. Click the link to reset your password: ${resetUrl}`
    )

    res.status(200).json({
      message: 'If that email is registered, a reset link has been sent.',
    })
  } catch (error: unknown) {
    res.status(500).json({
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}

// Verify Code
export const verifyCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      res.status(400).json({ success: false, message: 'User not found' })
      return
    }
    if (user.isVerified) {
      res.status(400).json({ success: false, message: 'User already verified' })
      return
    }
    if (user.verificationCode !== code) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid verification code' })
      return
    }
    user.isVerified = true
    user.verificationCode = undefined
    await user.save()
    res
      .status(200)
      .json({ success: true, message: 'Email verified successfully' })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}

// Reset Password
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, email, password } = req.body
    if (!token || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Token, email, and new password are required',
      })
      return
    }
    const user = await User.findOne({
      email,
      resetPasswordExpires: { $gt: new Date() },
    })
    if (!user || !user.resetPasswordToken) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid or expired token' })
      return
    }
    const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken)
    if (!isTokenValid) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid or expired token' })
      return
    }
    user.password = await bcrypt.hash(password, 10)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()
    res
      .status(200)
      .json({ success: true, message: 'Password has been reset successfully' })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}

// Change Password
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword, userId } = req.body

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: 'Current password is incorrect' })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}

// Update User Information
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let imageUrl = req.body.avatar
       if (req.file) {
          await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream((error, result) => {
              if (error) {
                reject(error)
                return
              }
              imageUrl = result?.secure_url || ''
              resolve(result)
            })
            if (!req.file?.buffer) {
              reject(new Error('File buffer is undefined'))
              return
            }
            stream.end(req.file.buffer)
          })
        }

    const { name, phoneNumber, userId, country, cityState } = req.body

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' })
      return
    }

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    // Update user fields
    if (name) user.name = name
    if (phoneNumber) user.phoneNumber = phoneNumber
    if (country) user.country = country
    if (cityState) user.cityState = cityState
    if (imageUrl) user.avatar = imageUrl

    await user.save()

    res.status(200).json({
      success: true,
      message: 'User information updated successfully',
      data: user,
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    })
  }
}