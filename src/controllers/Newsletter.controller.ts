import Subscription from "../models/Newsletter.model";
import { Request, Response } from "express";
import nodemailer from "nodemailer";

// Subscribe to newsletter
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res
        .status(400)
        .json({ success: false, message: "E-Mail ist erforderlich" });
      return;
    }
    const existing = await Subscription.findOne({ email });
    if (existing) {
      res
        .status(400)
        .json({ success: false, message: "E-Mail ist bereits abonniert" });
      return;
    }
    await Subscription.create({ email });
    res.status(201).json({ success: true, message: "Erfolgreich abonniert" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: error.message,
    });
  }
};

// Unsubscribe from newsletter
export const unsubscribe = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const email = (req.query.email as string) || req.body.email;
    if (!email) {
      res.status(400).send("<h2>E-Mail ist erforderlich</h2>");
      return;
    }

    const deleted = await Subscription.findOneAndDelete({ email });
    if (!deleted) {
      res.status(404).send("<h2>E-Mail nicht gefunden</h2>");
      return;
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8"/>
        <title>Abmeldung</title>
        <style>
          body { font-family: Arial, sans-serif; background:#f4f4f4; text-align:center; padding:50px; }
          .box { background:#fff; max-width:500px; margin:auto; padding:40px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.2); }
          h2 { color:#333; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Sie haben sich erfolgreich vom Newsletter abgemeldet.</h2>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send("<h2>Interner Serverfehler</h2>");
  }
};

// export const unsubscribe = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { email } = req.body;
//     if (!email) {
//       res
//         .status(400)
//         .json({ success: false, message: "E-Mail ist erforderlich" });
//       return;
//     }
//     const deleted = await Subscription.findOneAndDelete({ email });
//     if (!deleted) {
//       res
//         .status(404)
//         .json({ success: false, message: "E-Mail nicht gefunden" });
//       return;
//     }
//     res.status(200).json({ success: true, message: "Erfolgreich abgemeldet" });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: "Interner Serverfehler",
//       error: error.message,
//     });
//   }
// };

// List all subscribers (admin only, simple version)
export const listSubscribers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const subscribers = await Subscription.find({}, "email createdAt");
    res.status(200).json({ success: true, subscribers });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: error.message,
    });
  }
};

// Send newsletter to all subscribers
export const sendNewsletter = async (req: Request, res: Response) => {
  try {
    const { subject, content } = req.body;

    if (!subject || !content) {
      res.status(400).json({
        success: false,
        message: "Betreff und Inhalt sind erforderlich",
      });
      return;
    }

    const subscribers = await Subscription.find({}, "email");
    const emails = subscribers.map((s: any) => s.email);

    const transporter = nodemailer.createTransport({
      host: "smtps.udag.de",
      port: 465,
      secure: true,
      auth: {
        user: process.env.NEWSLETTER_EMAIL_USER,
        pass: process.env.NEWSLETTER_EMAIL_PASS,
      },
    });

    for (const email of emails) {
      await transporter.sendMail({
        from: `"Walk Throughz" <${process.env.NEWSLETTER_EMAIL_USER}>`,
        to: email,
        subject,
        text: content,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; background:#212121; color:#fff; }
    .container { max-width:600px; margin:20px auto; background:#2c2c2c; border-radius:8px; overflow:hidden; }
    .header { background:#222; padding:20px; text-align:center; color: #fff; }
    .logo {
      background-image: url('https://res.cloudinary.com/dftvlksve/image/upload/v1756129458/Image20250819174530_hjqear.jpg');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      height: 110px;
      max-width: 350px;
      margin: 0 auto;
    }
    .content { padding:30px; }
    .content p { color: #fff; }
    .footer { background:#222; padding:20px; text-align:center; font-size:13px; color:#aaa; }
    .footer a { color:#fff; text-decoration:underline; }
    .btn { display:inline-block; margin-top:15px; padding:10px 18px; background:#e53935; color:#fff; border-radius:6px; text-decoration:none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"></div>
      <h1>Deine aktuellen Walk Throughz</h1>
    </div>
    <div class="content">
      <p>Hey Entdecker 👋,</p>
      <div style="background:#1a1a1a; padding:20px; border-radius:8px; color: #fff;">
        ${content}
      </div>
      <p>Freu dich auf weitere spannende Angebote & Erlebnisse.</p>
      <p>Bis bald!</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Walk Throughz. Alle Rechte vorbehalten. <br/>
      <a class="btn" href="${
        process.env.APP_URL
      }/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}">
        Vom Newsletter abmelden
      </a>
    </div>
  </div>
</body>
</html>

`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Newsletter erfolgreich an alle Abonnenten gesendet",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden des Newsletters",
      error: error.message,
    });
  }
};

// export const sendNewsletter = async (req: Request, res: Response) => {
//   try {
//     const { subject, content } = req.body;

//     if (!subject || !content) {
//       res.status(400).json({
//         success: false,
//         message: "Betreff und Inhalt sind erforderlich",
//       });
//       return;
//     }

//     const subscribers = await Subscription.find({}, "email");
//     const emails = subscribers.map((s: any) => s.email);

//     // Create united-domains SMTP transporter once
//     const transporter = nodemailer.createTransport({
//       host: "smtps.udag.de",
//       port: 465,
//       secure: true, // SSL
//       auth: {
//         user: process.env.NEWSLETTER_EMAIL_USER, // full email address
//         pass: process.env.NEWSLETTER_EMAIL_PASS, // email password
//       },
//     });

//     // Send newsletter to each subscriber
//     for (const email of emails) {
//       await transporter.sendMail({
//         from: `"Walk Throughz" <${process.env.NEWSLETTER_EMAIL_USER}>`,
//         to: email,
//         subject,
//         text: content,
//         html: `
// <!DOCTYPE html>
// <html>
// <head>
//   <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
//   <style>
//     body {
//       font-family: 'Poppins', Arial, sans-serif;
//       line-height: 1.6;
//       color: #f5f5f5;
//       max-width: 600px;
//       margin: 0 auto;
//       padding: 0;
//       background-color: #212121;
//     }
//     .container {
//       background-color: #2c2c2c;
//       border-radius: 8px;
//       overflow: hidden;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.5);
//       margin: 20px auto;
//     }
//     .header {
//       background-color: #222222;
//       color: #ffffff;
//       padding: 40px 20px;
//       text-align: center;
//       border-bottom: 1px solid #444;
//     }
//     .logo {
//       max-width: 350px;
//       margin-bottom: 20px;
//       display: block;
//       margin-left: auto;
//       margin-right: auto;
//     }
//     .header h1 {
//       margin: 0;
//       font-size: 26px;
//       font-weight: 600;
//       letter-spacing: 1px;
//     }
//     .content {
//       padding: 30px;
//       font-size: 16px;
//       color: #cccccc;
//     }
//     .newsletter-message {
//       background-color: #1a1a1a;
//       border-left: 4px solid #ffffff;
//       border-radius: 8px;
//       padding: 20px;
//       margin: 20px 0;
//     }
//     .footer {
//       margin-top: 30px;
//       font-size: 13px;
//       text-align: center;
//       color: #aaaaaa;
//       border-top: 1px solid #444;
//       padding: 20px;
//       background-color: #222222;
//     }
//     .footer a {
//       color: #ffffff;
//       text-decoration: underline;
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">

//       <img src="https://i.ibb.co.com/27558Kdw/wt-logoi.jpg" alt="wt-logoi" border="0" class="logo">
//       <h1 >Deine aktuellen Deals im Überblick</h1>
//     </div>

//     <div class="content">
//       <p>Hey Entdecker 👋,</p>

//       <div class="newsletter-message">
//         ${content}
//       </div>
//       <p>Freu dich auf weitere spannende Angebote & Erlebnisse.</p>
//       <p>Bis bald!</p>
//     </div>

//     <div class="footer">
//       © ${new Date().getFullYear()} Walk Throughz. Alle Rechte vorbehalten. <br/>
//       <a href="#">Abmelden vom Newsletter</a>
//     </div>
//   </div>
// </body>
// </html>
//     `,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Newsletter erfolgreich an alle Abonnenten gesendet",
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: "Fehler beim Senden des Newsletters",
//       error: error.message,
//     });
//   }
// };
