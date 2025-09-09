import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtps.udag.de', // united-domains SMTP server
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.NOTIFICATION_EMAIL_USER, // full email address
    pass: process.env.NOTIFICATION_EMAIL_PASS, // mailbox password
  },
})

/**
 * Send an email
 * @param to Recipient email
 * @param subject Subject of email
 * @param text Plain text body
 * @param html HTML body
 */
export const sendMail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> => {
  await transporter.sendMail({
    from: `"Walk Throughz" <${process.env.OTP_EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  })
}
