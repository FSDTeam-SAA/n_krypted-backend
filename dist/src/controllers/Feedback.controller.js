"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFeedbackApproval = exports.deleteFeedback = exports.getAllFeedbacks = exports.createFeedback = void 0;
const Feedback_model_1 = __importDefault(require("../models/Feedback.model"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const User_model_1 = __importDefault(require("../models/User.model"));
const pagination_1 = require("../utils/pagination");
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
const createFeedback = async (req, res) => {
    try {
        const { name, email, phoneNumber, subject, message } = req.body;
        if (!email || !message) {
            res
                .status(400)
                .json({ success: false, message: "Email and message are required" });
            return;
        }
        // Save feedback to DB
        const feedback = await Feedback_model_1.default.create({
            name,
            email,
            phoneNumber,
            message,
            subject,
        });
        // Find admin user
        const adminUser = await User_model_1.default.findOne({ role: "admin" });
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
        const transporter = nodemailer_1.default.createTransport({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create feedback",
            error: error.message,
        });
    }
};
exports.createFeedback = createFeedback;
// Get all feedbacks
const getAllFeedbacks = async (req, res) => {
    try {
        const { page, limit, skip } = await (0, pagination_1.getPaginationParams)(req.query);
        const totalItems = await Feedback_model_1.default.countDocuments();
        const feedbacks = await Feedback_model_1.default.find()
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const meta = await (0, pagination_1.buildMetaPagination)(totalItems, page, limit);
        res.status(200).json({ success: true, meta, feedbacks });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch feedbacks",
            error: error.message,
        });
    }
};
exports.getAllFeedbacks = getAllFeedbacks;
// Delete feedback
const deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback_model_1.default.findByIdAndDelete(id);
        if (!feedback) {
            res.status(404).json({ success: false, message: "Feedback not found" });
            return;
        }
        res
            .status(200)
            .json({ success: true, message: "Feedback deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete feedback",
            error: error.message,
        });
    }
};
exports.deleteFeedback = deleteFeedback;
// Toggle feedback approval
const toggleFeedbackApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback_model_1.default.findById(id);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update feedback approval status",
            error: error.message,
        });
    }
};
exports.toggleFeedbackApproval = toggleFeedbackApproval;
