import { Request, Response } from "express";
import Feedback from "../models/Feedback.model";
import nodemailer from "nodemailer";
import User from "../models/User.model";
import { buildMetaPagination, getPaginationParams } from "../utils/pagination";

// Create feedback
// export const createFeedback = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { name, email, phoneNumber, subject, message } = req.body

//     if (!email || !message) {
//       res
//         .status(400)
//         .json({ success: false, message: 'Email and message are required' })
//       return
//     }

//     // Save feedback to DB
//     const feedback = await Feedback.create({
//       name,
//       email,
//       phoneNumber,
//       message,
//       subject,
//     })

//     // Find admin user
//     const adminUser = await User.findOne({ role: 'admin' })
//     if (!adminUser) {
//       res.status(500).json({ success: false, message: 'Admin user not found' })
//       return
//     }

//     // Compose email text
//     const emailText = `
//       New Feedback Received:

//       Name: ${name || 'N/A'}
//       Email: ${email}
//       Phone Number: ${phoneNumber || 'N/A'}
//       Subject: ${subject || 'N/A'}
//       Message: ${message}
//     `

//     // Send email to admin
//     await sendEmail(adminUser.email, 'New Feedback Received', emailText)

//     res.status(201).json({ success: true, feedback })
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create feedback',
//       error: error.message,
//     })
//   }
// }

export const createFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phoneNumber, subject, message } = req.body;

    if (!email || !message) {
      res
        .status(400)
        .json({ success: false, message: "Email and message are required" });
      return;
    }

    // Save feedback to DB
    const feedback = await Feedback.create({
      name,
      email,
      phoneNumber,
      message,
      subject,
    });

    // Find admin user
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      res.status(500).json({ success: false, message: "Admin user not found" });
      return;
    }

    // Compose email text
    const emailText = `
      New Feedback Received:

      Name: ${name || "N/A"}
      Email: ${email}
      Phone Number: ${phoneNumber || "N/A"}
      Subject: ${subject || "N/A"}
      Message: ${message}
    `;

    // --- Direct united-domains SMTP send ---
    const transporter = nodemailer.createTransport({
      host: "smtps.udag.de",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.FEEDBACK_EMAIL_USER, // full email
        pass: process.env.FEEDBACK_EMAIL_PASS, // password
      },
    });

    await transporter.sendMail({
      from: `"Walk Throughz" <${process.env.FEEDBACK_EMAIL_USER}>`,
      to: adminUser.email,
      subject: "New Feedback Received",
      text: emailText,
      html: `<pre>${emailText}</pre>`,
    });
    // --- End SMTP send ---

    res.status(201).json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create feedback",
      error: error.message,
    });
  }
};

// Get all feedbacks
export const getAllFeedbacks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page, limit, skip } = await getPaginationParams(req.query);

    const totalItems = await Feedback.countDocuments();

    const feedbacks = await Feedback.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const meta = await buildMetaPagination(totalItems, page, limit);

    res.status(200).json({ success: true, meta, feedbacks });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedbacks",
      error: error.message,
    });
  }
};

// Delete feedback
export const deleteFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      res.status(404).json({ success: false, message: "Feedback not found" });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Feedback deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete feedback",
      error: error.message,
    });
  }
};

// Toggle feedback approval
export const toggleFeedbackApproval = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      res.status(404).json({ success: false, message: "Feedback not found" });
      return;
    }

    // Toggle the value
    feedback.isApproved = !feedback.isApproved;
    await feedback.save();

    res.status(200).json({
      success: true,
      message: `Feedback approval status updated to ${feedback.isApproved}`,
      isApproved: feedback.isApproved,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update feedback approval status",
      error: error.message,
    });
  }
};
