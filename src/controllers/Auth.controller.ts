import User from "../models/User.model";
import sendEmail from "../utils/email";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import cloudinary from "../utils/cloudinary";
import { getPaginationParams, buildMetaPagination } from "../utils/pagination";
import nodemailer from "nodemailer";

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
    const { name, email, phoneNumber, password } = req.body;

    // 1. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res
        .status(400)
        .json({ success: false, message: "Benutzer existiert bereits" });
      return;
    }

    // 2. Generate verification code
    const verificationCode = crypto.randomBytes(3).toString("hex");

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save new user
    const newUser = new User({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      verificationCode,
    });
    await newUser.save();

    // 5. Setup SMTP transporter for united-domains.de
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
  <div style="font-family: Arial, Helvetica, sans-serif; background-color:#2c2c2c; color:#ffffff; padding:0; max-width:600px; margin:auto; border-radius:8px; overflow:hidden;">

    <!-- Top bar / logo (CSS background image) -->
    <div style="background-color:#222222; padding:20px; text-align:center;">
      <div style="
        background-image:url('https://res.cloudinary.com/dftvlksve/image/upload/v1756129458/Image20250819174530_hjqear.jpg');
        background-repeat:no-repeat;
        background-position:center;
        background-size:contain;
        height:110px;
        max-width:350px;
        margin:0 auto;
      "></div>
    </div>

    <!-- Title below the top bar -->
    <div style="padding:0 20px 8px; text-align:center;">
      <h1 style="font-size:20px; line-height:28px; margin:16px 0 0; font-weight:700; color:#ffffff !important; text-align:center;">
        Willkommen
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:20px; text-align:center; font-size:16px; line-height:24px;">
      <p style="margin:0 0 16px; color:#ffffff !important;">
        Hey, schön, dass du dabei bist!
      </p>
      <p style="margin:0 0 8px; color:#ffffff !important;">
        Um deine Anmeldung abzuschließen, bestätige bitte deine E-Mail mit dem folgenden Code:
      </p>

      <!-- Verification code -->
      <div style="background:#000000; color:#ffffff !important; font-size:24px; letter-spacing:4px; font-weight:bold; padding:15px 20px; border-radius:6px; margin:20px auto; display:inline-block;">
        ${verificationCode}
      </div>

      <p style="margin:20px 0 0; color:#ffffff !important;">
        Gib den Code einfach in der Anmeldemaske ein – und schon kann’s losgehen!
      </p>

      <!-- Centered sign-off -->
      <p style="margin:24px 0 0; font-size:16px; color:#ffffff !important; text-align:center;">
        Viele Grüße<br/>Dein Walk Throughz Team
      </p>
    </div>
  </div>
  `,
    });

    // 7. Respond
    res.status(201).json({
      success: true,
      message: "Benutzer registriert. Bitte verifizieren Sie Ihre E-Mail.",
    });
  } catch (error: unknown) {
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
    const { email, password } = req.body;

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

    res.status(200).json({ success: true, data: user, token: token });
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
    <div style="text-align:center; padding:12px 20px 0;">
      <h1 style="font-size:20px; line-height:28px; margin:0; font-weight:700; color:#ffffff !important;">
        Neues Passwort, neues Glück
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
           style="display:inline-block; margin:10px 0; padding:12px 20px; background:#e53935; color:#ffffff !important; border-radius:6px; text-decoration:none; font-weight:bold; font-size:16px;">
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
        Viele Grüße<br/>Dein Walk Throughz Team
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
        Willkommen
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
        Viele Grüße<br/>Dein Walk Throughz Team
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
    if (user.verificationCode !== code) {
      res
        .status(400)
        .json({ success: false, message: "Ungültiger Verifizierungscode" });
      return;
    }
    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "E-Mail erfolgreich verifiziert" });
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

    const totalUser = await User.countDocuments();

    const allUser = await User.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

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
