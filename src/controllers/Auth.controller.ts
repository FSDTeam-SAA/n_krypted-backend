import User from "../models/User.model";
import sendEmail from "../utils/email";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import cloudinary from "../utils/cloudinary";
import { getPaginationParams, buildMetaPagination } from "../utils/pagination";
import nodemailer from "nodemailer";
import Booking from "../models/Booking.model";
import Review from "../models/Review.model";
import mongoose from "mongoose";

// Benutzerregistrierung
// export const register = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { name, email, phoneNumber, password } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       res
//         .status(400)
//         .json({ success: false, message: "Benutzer existiert bereits" });
//       return;
//     }

//     const verificationCode = crypto.randomBytes(3).toString("hex");

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = new User({
//       name,
//       email,
//       phoneNumber,
//       password: hashedPassword,
//       verificationCode,
//     });

//     await newUser.save();

//     await sendEmail(
//       email,
//       "Verifizieren Sie Ihre E-Mail",
//       `Ihr Verifizierungscode ist: ${verificationCode}`
//     );

//     res.status(201).json({
//       success: true,
//       message: "Benutzer registriert. Bitte verifizieren Sie Ihre E-Mail.",
//     });
//   } catch (error: unknown) {
//     res.status(500).json({
//       success: false,
//       message: "Interner Serverfehler",
//       error: (error as Error).message,
//     });
//   }
// };

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phoneNumber, password } = req.body;
    const email = req.body.email?.toString().trim().toLowerCase();
    // Public registration may only create customer or restaurant-owner
    // accounts. Admin accounts are never accepted from a client payload.
    const requestedRole =
      req.body.role === "restaurant_owner" ? "restaurant_owner" : "user";

    if (!name?.toString().trim() || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
      return;
    }

    // 1. Check if user exists
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      res
        .status(400)
        .json({ success: false, message: "User already exists and is verified" });
      return;
    }

    // 2. Generate verification code
    const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    if (requestedRole === "user") {
      console.log(`\n========================================`);
      console.log(`[AUTH REGISTRATION] Verification OTP for ${email}: ${verificationCode}`);
      console.log(`========================================\n`);
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save new user or update unverified user
    if (user) {
      user.name = name || user.name;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.password = hashedPassword;
      user.verificationCode =
        requestedRole === "user" ? verificationCode : undefined;
      user.role = requestedRole;
      if (requestedRole === "restaurant_owner") user.isVerified = true;
      await user.save();
    } else {
      user = new User({
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        verificationCode:
          requestedRole === "user" ? verificationCode : undefined,
        isVerified: requestedRole === "restaurant_owner",
        role: requestedRole,
      });
      await user.save();
    }

    // 5. Try to send email via SMTP if configured
    const emailUser = process.env.OTP_EMAIL_USER || process.env.GMAIL_SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.OTP_EMAIL_PASS || process.env.GMAIL_SMTP_APP_PASSWORD || process.env.EMAIL_PASS;

    if (
      requestedRole === "user" &&
      emailUser &&
      emailPass &&
      !emailUser.includes('your_gmail')
    ) {
      try {
        const transporter = nodemailer.createTransport({
          host: emailUser.includes('gmail') ? 'smtp.gmail.com' : 'smtps.udag.de',
          port: 465,
          secure: true,
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });

        await transporter.sendMail({
          from: `"Walk Throughz" <${emailUser}>`,
          to: email,
          subject: "Bitte bestätige deine E-Mail",
          text: `Dein Bestätigungscode lautet: ${verificationCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; background-color:#1E1E1E; color:#ffffff; padding:24px; border-radius:12px; max-width:500px; margin:auto;">
              <h2 style="color:#00A8FF; text-align:center;">Walk Throughz</h2>
              <p style="text-align:center; font-size:16px;">Dein Bestätigungscode lautet:</p>
              <div style="background:#000000; color:#00A8FF; font-size:28px; letter-spacing:6px; font-weight:bold; padding:16px; text-align:center; border-radius:8px; border:1px solid #00A8FF; margin:20px 0;">
                ${verificationCode}
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn(`[SMTP WARN] Email sending failed: ${(mailErr as Error).message}. (OTP printed to console: ${verificationCode})`);
      }
    } else if (requestedRole === "user") {
      console.log(`[SMTP INFO] SMTP not configured in .env. Use console OTP: ${verificationCode}`);
    }

    // 6. Respond with success
    res.status(201).json({
      success: true,
      message:
        requestedRole === "restaurant_owner"
          ? "Restaurant owner registered. You can now sign in and create your restaurant."
          : "Benutzer registriert. Bitte verifizieren Sie Ihre E-Mail.",
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      }
    });
  } catch (error: unknown) {
    console.error("[REGISTER ERROR]", error);

    // A bad payload is the client's problem, not a server fault — answer 400
    // with the offending fields so the app can show something a person can act
    // on instead of a generic 500.
    const err = error as { name?: string; code?: number; errors?: Record<string, { message: string }> };

    if (err?.name === "ValidationError" && err.errors) {
      res.status(400).json({
        success: false,
        message: Object.values(err.errors).map((e) => e.message).join(" "),
        fields: Object.keys(err.errors),
      });
      return;
    }

    if (err?.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Diese E-Mail-Adresse ist bereits registriert.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Benutzeranmeldung
export const login = async (req: Request, res: Response) => {
  try {
    const email = req.body.email?.toString().trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "E-Mail und Passwort sind erforderlich",
      });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res
        .status(400)
        .json({ success: false, message: "E-Mail oder Passwort inkorrekt" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: "E-Mail oder Passwort inkorrekt" });
      return;
    }

    if (!user.isVerified) {
      res.status(400).json({
        success: false,
        message: "Bitte verifizieren Sie zuerst Ihre E-Mail",
      });
      return;
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "50h",
    });

    const safeUser = await User.findById(user._id).select(
      "-password -verificationCode -resetPasswordToken -resetPasswordExpires"
    );
    res.status(200).json({ success: true, data: safeUser, token: token });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Passwort vergessen
// export const forgotPassword = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { email } = req.body

//     const user = await User.findOne({ email })
//     // Immer mit Erfolg antworten, um E-Mail-Enumeration zu verhindern
//     if (!user) {
//       res.status(200).json({
//         message:
//           'Falls diese E-Mail registriert ist, wurde ein Zurücksetzungslink gesendet.',
//       })
//       return
//     }

//     const resetToken = crypto.randomBytes(20).toString('hex')
//     const resetTokenHash = await bcrypt.hash(resetToken, 10)
//     user.resetPasswordToken = resetTokenHash
//     user.resetPasswordExpires = new Date(Date.now() + 3600000)

//     await user.save()

//     // Verwende eine Frontend-URL zum Zurücksetzen
//     const resetUrl = `${
//       process.env.FRONTEND_URL || 'http://localhost:3000'
//     }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
//     await sendEmail(
//       email,
//       'Anfrage zum Zurücksetzen des Passworts',
//       `Sie haben eine Passwortzurücksetzung angefordert. Klicken Sie auf den Link, um Ihr Passwort zurückzusetzen: ${resetUrl}`
//     )

//     res.status(200).json({
//       message:
//         'Falls diese E-Mail registriert ist, wurde ein Zurücksetzungslink gesendet.',
//     })
//   } catch (error: unknown) {
//     res.status(500).json({
//       message: 'Interner Serverfehler',
//       error: (error as Error).message,
//     })
//   }
// }

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always respond with success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        message:
          "Falls diese E-Mail registriert ist, wurde ein Zurücksetzungslink gesendet.",
      });
      return;
    }

    // Create token & hash for storing
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // Build reset link
    const resetUrl = `${
      process.env.FRONTEND_URL
    }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // --- Direct SMTP Send ---
    const transporter = nodemailer.createTransport({
      host: "smtps.udag.de",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.FORGOT_PASSWORD_EMAIL_USER, // your united-domains full email
        pass: process.env.FORGOT_PASSWORD_EMAIL_PASS, // your email password
      },
    });

    await transporter.sendMail({
      from: `"Walk Throughz" <${process.env.FORGOT_PASSWORD_EMAIL_USER}>`,
      to: email,
      subject: "Passwort zurücksetzen – dein sicherer Link",
      text: `Neues Passwort, neues Glück

Hey,
du hast angefordert, dein Passwort zurückzusetzen.
Klicke einfach auf den Button unten, um ein neues Passwort festzulegen:
${resetUrl}

Falls der Button nicht funktioniert, kopiere bitte folgenden Link in deinen Browser:
${resetUrl}

Aus Sicherheitsgründen ist dieser Link nur für kurze Zeit gültig.

Viele Grüße
Dein Walk Throughz Team`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0; font-family: Arial, sans-serif; background:#212121; color:#ffffff;">
  <div style="max-width:600px; margin:20px auto; background:#2c2c2c; border-radius:8px; overflow:hidden;">

    <!-- Header -->
    <div style="background:#222222; padding:20px; text-align:center;">
      <div style="
        background-image: url('https://res.cloudinary.com/dftvlksve/image/upload/v1756129458/Image20250819174530_hjqear.jpg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        height: 110px;
        max-width: 350px;
        margin: 0 auto;
      "></div>
    </div>

    <!-- Title -->
   <div style="text-align:center; padding:12px 20px 12px;">
  <h1 style="font-size:20px; line-height:28px; margin:0; font-weight:700; color:#ffffff !important;">
    Neues Passwort,<br/>neues Glück
  </h1>
</div>


    <!-- Content -->
    <div style="padding:30px; font-size:16px; line-height:24px; color:#ffffff !important;">
      <p style="margin:0 0 16px; color:#ffffff !important;">Hey,</p>

      <div style="background:#1a1a1a; padding:20px; border-radius:8px; text-align:center; color:#ffffff !important;">
        <p style="margin:0 0 20px; color:#ffffff !important;">
          du hast angefordert, dein Passwort zurückzusetzen. Klicke einfach auf den Button, um ein neues Passwort festzulegen:
        </p>

        <a href="${resetUrl}" 
           style="display:inline-block; margin:10px 0; padding:12px 20px; background:#000000; color:#ffffff !important; border:1px solid #ffffff; border-radius:6px; text-decoration:none; font-weight:bold; font-size:16px;">
          Neues Passwort wählen
        </a>

        <p style="margin:20px 0 10px; font-size:14px; color:#cccccc !important;">
          Falls der Button nicht funktioniert, kopiere bitte folgenden Link in deinen Browser:
        </p>

        <p style="margin:0;">
          <a href="${resetUrl}" style="color:#4da3ff !important; word-break:break-all;">${resetUrl}</a>
        </p>

        <p style="font-size:13px; color:#aaaaaa !important; margin-top:16px;">
          Aus Sicherheitsgründen ist dieser Link nur für kurze Zeit gültig.
        </p>
      </div>

      <!-- Sign-off -->
       <p style="margin:24px 0 0; font-size:16px; color:#ffffff !important; text-align:center;">
        Viele Grüße<br/>Dein <strong>Walk Throughz</strong> Team
</p>
    </div>

  </div>
</body>
</html>

`,
    });

    // --- End SMTP Send ---

    res.status(200).json({
      message:
        "Falls diese E-Mail registriert ist, wurde ein Zurücksetzungslink gesendet.",
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

export const resendVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    console.log("Resend verification request for email:", email);

    const user = await User.findOne({ email });

    // Always respond with success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        message:
          "Falls diese E-Mail registriert ist, wurde ein Zurücksetzungslink gesendet.",
      });
      return;
    }

    const verificationCode = crypto.randomBytes(3).toString("hex");

    user.verificationCode = verificationCode;

    await user.save();

    // --- Direct SMTP Send ---
    const transporter = nodemailer.createTransport({
      host: "smtps.udag.de", // united-domains SMTP server
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.OTP_EMAIL_USER, // full email address
        pass: process.env.OTP_EMAIL_PASS, // mailbox password
      },
    });

    // 6. Send email
    await transporter.sendMail({
      from: `"Walk Throughz" <${process.env.OTP_EMAIL_USER}>`,
      to: email,
      subject: "Bitte bestätige deine E-Mail",
      text: `Hey, schön, dass du dabei bist! 
Um deine Anmeldung abzuschließen, bestätige bitte deine E-Mail mit dem folgenden Code:

Dein Bestätigungscode lautet: ${verificationCode}

Gib den Code einfach in der Anmeldemaske ein – und schon kann’s losgehen!

Vielen Dank und herzlich willkommen!
Dein Walk Throughz Team`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0; font-family: Arial, sans-serif; background:#212121; color:#ffffff;">
  <div style="max-width:600px; margin:20px auto; background:#2c2c2c; border-radius:8px; overflow:hidden;">

    <!-- Header / Logo -->
    <div style="background:#222222; padding:20px; text-align:center;">
      <div style="
        background-image: url('https://res.cloudinary.com/dftvlksve/image/upload/v1756129458/Image20250819174530_hjqear.jpg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        height: 110px;
        max-width: 350px;
        margin: 0 auto;
      "></div>
    </div>

    <!-- Title below logo -->
    <div style="text-align:center; padding:12px 20px 0;">
      <h1 style="font-size:20px; line-height:28px; margin:0; font-weight:700; color:#ffffff !important;">
        Willkommen!
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:20px; text-align:center; font-size:16px; line-height:24px; color:#ffffff !important;">
      <p style="margin:0 0 16px; color:#ffffff !important;">
        Hey, schön, dass du dabei bist!
      </p>
      <p style="margin:0 0 8px; color:#ffffff !important;">
        Um deine Anmeldung abzuschließen, bestätige bitte deine E-Mail mit dem folgenden Code:
      </p>

      <!-- Code block -->
      <div style="background:#000000; color:#ffffff !important; font-size:24px; letter-spacing:4px; font-weight:bold; padding:15px 20px; border-radius:6px; margin:20px auto; display:inline-block;">
        ${verificationCode}
      </div>

      <p style="margin:20px 0 0; color:#ffffff !important;">
        Gib den Code einfach in der Anmeldemaske ein – und schon kann’s losgehen!
      </p>

      <!-- Sign-off -->
      <p style="margin:24px 0 0; font-size:16px; color:#ffffff !important; text-align:center;">
        Viele Grüße<br/>Dein <strong>Walk Throughz</strong> Team
</p>
    </div>

  </div>
</body>
</html>
  `,
    });

    res.status(200).json({
      message:
        "Falls diese E-Mail registriert ist, wurde ein Zurücksetzungslink gesendet.",
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Verifizierungscode
export const verifyCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res
        .status(400)
        .json({ success: false, message: "Benutzer nicht gefunden" });
      return;
    }
    if (user.isVerified) {
      res
        .status(400)
        .json({ success: false, message: "Benutzer bereits verifiziert" });
      return;
    }

    const inputCode = code?.toString().trim().toUpperCase();
    const storedCode = user.verificationCode?.toString().trim().toUpperCase();

    if (!inputCode || storedCode !== inputCode) {
      res
        .status(400)
        .json({ success: false, message: "Ungültiger Verifizierungscode" });
      return;
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', {
      expiresIn: "50h",
    });

    res.status(200).json({
      success: true,
      message: "E-Mail erfolgreich verifiziert",
      data: user,
      token: token,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Passwort zurücksetzen
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Token, E-Mail und neues Passwort sind erforderlich",
      });
      return;
    }
    const user = await User.findOne({
      email,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user || !user.resetPasswordToken) {
      res.status(400).json({
        success: false,
        message: "Ungültiger oder abgelaufener Token",
      });
      return;
    }
    const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isTokenValid) {
      res.status(400).json({
        success: false,
        message: "Ungültiger oder abgelaufener Token",
      });
      return;
    }
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Passwort wurde erfolgreich zurückgesetzt",
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Passwort ändern
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword, userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res
        .status(404)
        .json({ success: false, message: "Benutzer nicht gefunden" });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: "Aktuelles Passwort ist falsch" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Passwort erfolgreich geändert",
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Benutzerinformationen aktualisieren
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let imageUrl = req.body.avatar;
    if (req.file) {
      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
          if (error) {
            reject(error);
            return;
          }
          imageUrl = result?.secure_url || "";
          resolve(result);
        });
        if (!req.file?.buffer) {
          reject(new Error("Dateipuffer ist undefiniert"));
          return;
        }
        stream.end(req.file.buffer);
      });
    }

    const { name, phoneNumber, userId, country, cityState } = req.body;

    if (!userId) {
      res
        .status(400)
        .json({ success: false, message: "Benutzer-ID ist erforderlich" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res
        .status(404)
        .json({ success: false, message: "Benutzer nicht gefunden" });
      return;
    }

    // Benutzerfelder aktualisieren
    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (country) user.country = country;
    if (cityState) user.cityState = cityState;
    if (imageUrl) user.avatar = imageUrl;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Benutzerinformationen erfolgreich aktualisiert",
      data: user,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: (error as Error).message,
    });
  }
};

// Einzelnen Benutzer abrufen
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select(
      "-password -verificationCode -resetPasswordToken -resetPasswordExpires"
    );
    if (!user) {
      res.status(404).json({ message: "Benutzer nicht gefunden" });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Alle Benutzer abrufen
export const getAllUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter = {
      role: { $ne: "restaurant_owner" },
      ...(search
        ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
        : {}),
    };

    const [totalUser, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password -verificationCode -resetPasswordToken -resetPasswordExpires")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    const userIds = users.map((user) => user._id);
    const [bookingCounts, reviewCounts] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            userId: { $in: userIds },
            isBooked: true,
            paymentStatus: "complete",
          },
        },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { userID: { $in: userIds } } },
        { $group: { _id: "$userID", count: { $sum: 1 } } },
      ]),
    ]);
    const bookingCountByUser = new Map(
      bookingCounts.map((item) => [item._id.toString(), item.count])
    );
    const reviewCountByUser = new Map(
      reviewCounts.map((item) => [item._id.toString(), item.count])
    );
    const allUser = users.map((user) => ({
      ...user,
      checkInCount: bookingCountByUser.get(user._id.toString()) || 0,
      reviewCount: reviewCountByUser.get(user._id.toString()) || 0,
    }));

    const meta = buildMetaPagination(totalUser, page, limit);

    res.status(200).json({
      success: true,
      meta,
      data: allUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantOwners = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter: Record<string, unknown> = { role: "restaurant_owner" };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }
    const [totalItems, owners] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password -verificationCode -resetPasswordToken -resetPasswordExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      meta: buildMetaPagination(totalItems, page, limit),
      data: owners,
    });
  } catch (error) {
    next(error);
  }
};

export const createRestaurantOwner = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const name = req.body.name?.toString().trim();
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password?.toString();

    if (!name || !email || !password || password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Name, email and a password of at least 6 characters are required",
      });
      return;
    }
    if (await User.exists({ email })) {
      res.status(409).json({
        success: false,
        message: "This email address is already registered",
      });
      return;
    }

    const owner = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      phoneNumber: req.body.phoneNumber?.toString().trim() || undefined,
      country: req.body.country?.toString().trim() || undefined,
      cityState: req.body.cityState?.toString().trim() || undefined,
      role: "restaurant_owner",
      isVerified: true,
    });
    const safeOwner = await User.findById(owner._id).select(
      "-password -verificationCode -resetPasswordToken -resetPasswordExpires"
    );

    res.status(201).json({
      success: true,
      message: "Restaurant owner created successfully",
      data: safeOwner,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Failed to create restaurant owner",
      error: (error as Error).message,
    });
  }
};

export const updateRestaurantOwner = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid owner ID" });
      return;
    }

    const owner = await User.findOne({ _id: id, role: "restaurant_owner" });
    if (!owner) {
      res.status(404).json({
        success: false,
        message: "Restaurant owner not found",
      });
      return;
    }

    if (req.body.email !== undefined) {
      const email = req.body.email?.toString().trim().toLowerCase();
      if (!email) {
        res.status(400).json({ success: false, message: "Email is required" });
        return;
      }
      const duplicate = await User.exists({ email, _id: { $ne: owner._id } });
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: "This email address is already registered",
        });
        return;
      }
      owner.email = email;
    }

    if (req.body.name !== undefined) {
      const name = req.body.name?.toString().trim();
      if (!name) {
        res.status(400).json({ success: false, message: "Name is required" });
        return;
      }
      owner.name = name;
    }
    if (req.body.phoneNumber !== undefined) {
      owner.phoneNumber = req.body.phoneNumber?.toString().trim() || undefined;
    }
    if (req.body.country !== undefined) {
      owner.country = req.body.country?.toString().trim() || undefined;
    }
    if (req.body.cityState !== undefined) {
      owner.cityState = req.body.cityState?.toString().trim() || undefined;
    }
    if (req.body.password) {
      const password = req.body.password.toString();
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
        return;
      }
      owner.password = await bcrypt.hash(password, 10);
    }
    await owner.save();
    const safeOwner = await User.findById(owner._id).select(
      "-password -verificationCode -resetPasswordToken -resetPasswordExpires"
    );
    res.status(200).json({
      success: true,
      message: "Restaurant owner updated successfully",
      data: safeOwner,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Failed to update restaurant owner",
      error: (error as Error).message,
    });
  }
};

// Benutzer löschen
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.query.userId;
    const deleteUser = await User.findByIdAndDelete(userId);
    if (!deleteUser) {
      res.status(404).json({
        success: false,
        message: "Benutzer konnte nicht gelöscht werden",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Benutzer erfolgreich gelöscht",
    });
  } catch (error) {
    next();
  }
};

export const bulkDeleteUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids)] : [];
    if (
      ids.length === 0 ||
      ids.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))
    ) {
      res.status(400).json({
        success: false,
        message: "Eine gültige Liste von Benutzer-IDs ist erforderlich",
      });
      return;
    }

    const result = await User.deleteMany({
      _id: { $in: ids, $ne: req.user?.id },
      role: "user",
    });

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      skippedCount: ids.length - result.deletedCount,
      message: `${result.deletedCount} Benutzer wurden gelöscht`,
    });
  } catch (error) {
    next(error);
  }
};
