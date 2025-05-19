import { Request, Response } from 'express'
import Feedback from '../models/Feedback.model'
import sendEmail from '../utils/email'
import User from '../models/User.model'
// Create feedback
export const createFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phoneNumber, subject, message } = req.body

    if (!email || !message) {
      res
        .status(400)
        .json({ success: false, message: 'Email and message are required' })
      return
    }

    // Save feedback to DB
    const feedback = await Feedback.create({
      name,
      email,
      phoneNumber,
      message,
      subject,
    })

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' })
    if (!adminUser) {
      res.status(500).json({ success: false, message: 'Admin user not found' })
      return
    }

    // Compose email text
    const emailText = `
      New Feedback Received:

      Name: ${name || 'N/A'}
      Email: ${email}
      Phone Number: ${phoneNumber || 'N/A'}
      Subject: ${subject || 'N/A'}
      Message: ${message}
    `

    // Send email to admin
    await sendEmail(adminUser.email, 'New Feedback Received', emailText)

    res.status(201).json({ success: true, feedback })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create feedback',
      error: error.message,
    })
  }
}

// Get all feedbacks
export const getAllFeedbacks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, feedbacks })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedbacks',
      error: error.message,
    })
  }
}

// Delete feedback
export const deleteFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const feedback = await Feedback.findByIdAndDelete(id)

    if (!feedback) {
      res.status(404).json({ success: false, message: 'Feedback not found' })
      return
    }

    res
      .status(200)
      .json({ success: true, message: 'Feedback deleted successfully' })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message,
    })
  }
}
