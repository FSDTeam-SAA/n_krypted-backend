import Subscription from '../models/Newsletter.model'
import { Request, Response } from 'express'
import sendEmail from '../utils/email'

// Subscribe to newsletter
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' })
      return
    }
    const existing = await Subscription.findOne({ email })
    if (existing) {
      res
        .status(400)
        .json({ success: false, message: 'Email already subscribed' })
      return
    }
    await Subscription.create({ email })
    res.status(201).json({ success: true, message: 'Subscribed successfully' })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

// Unsubscribe from newsletter
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' })
      return
    }
    const deleted = await Subscription.findOneAndDelete({ email })
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Email not found' })
      return
    }
    res
      .status(200)
      .json({ success: true, message: 'Unsubscribed successfully' })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

// List all subscribers (admin only, simple version)
export const listSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await Subscription.find({}, 'email createdAt')
    res.status(200).json({ success: true, subscribers })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

// Send newsletter to all subscribers
export const sendNewsletter = async (req: Request, res: Response) => {
  try {
    const { subject, content } = req.body
    if (!subject || !content) {
       res
        .status(400)
        .json({ success: false, message: 'Subject and content are required' })
        return
    }
    const subscribers = await Subscription.find({}, 'email')
    const emails = subscribers.map((s: any) => s.email)
    for (const email of emails) {
      await sendEmail(email, subject, content)
    }
    res
      .status(200)
      .json({ success: true, message: 'Newsletter sent to all subscribers' })
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to send newsletter',
        error: error.message,
      })
  }
}
