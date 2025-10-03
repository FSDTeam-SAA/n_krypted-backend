"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: 'smtps.udag.de', // united-domains SMTP server
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.NOTIFICATION_EMAIL_USER, // full email address
        pass: process.env.NOTIFICATION_EMAIL_PASS, // mailbox password
    },
});
/**
 * Send an email
 * @param to Recipient email
 * @param subject Subject of email
 * @param text Plain text body
 * @param html HTML body
 */
const sendMail = async (to, subject, text, html) => {
    await transporter.sendMail({
        from: `"Walk Throughz" <${process.env.OTP_EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
    });
};
exports.sendMail = sendMail;
