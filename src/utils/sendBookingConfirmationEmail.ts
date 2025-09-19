import nodemailer from "nodemailer";

export const sendBookingConfirmationEmail = async (
  to: string,
  bookingDetails: any,
  dealDetails: any,
  userDetails: any
) => {
  // united-domains SMTP config
  const transporter = nodemailer.createTransport({
    host: "smtps.udag.de", // united-domains SMTP
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.BOOKING_EMAIL_USER, // full email address from united-domains
      pass: process.env.BOOKING_EMAIL_PASS, // password or app password
    },
  });

  const formattedDate = new Date(
    bookingDetails.scheduleDate
  ).toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #f5f5f5;
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
      background-color: #212121;
    }
    .container {
      background-color: #2c2c2c;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      margin: 20px auto;
    }
    .header {
      background-color: #212121;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
      border-bottom: 1px solid #444;
    }
    .header h1 {
      margin: 0;
      font-size: 20px; /* fixed headline size */
      letter-spacing: 1px;
      color: #ffffff;
    }
    .content { padding: 30px; color: #f5f5f5; font-size: 16px; line-height: 24px; }
    .greeting { font-size: 16px; margin-bottom: 20px; color: #ffffff; }
    .booking-card {
      background-color: #1a1a1a;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #ffffff;
      color: #f5f5f5;
      font-size: 16px;
      line-height: 24px;
    }
    .deal-title { color: #ffffff; margin-top: 0; font-size: 16px; font-weight:bold; }
    .detail-row { margin-bottom: 10px; display: flex; color: #f5f5f5; font-size: 16px; }
    .detail-label { font-weight: bold; min-width: 100px; color: #cccccc; }
    .detail-row span { color: #f5f5f5; }
    .booking-id-badge {
      background-color: #ffffff;
      color: #212121;
      padding: 6px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 16px; /* fixed */
      display: inline-block;
      margin: 10px 0;
      box-shadow: 0 2px 5px rgba(255,255,255,0.2);
    }
    .description { margin: 15px 0; line-height: 1.5; color: #dddddd; font-size:16px; }
    .button-container { text-align: center; margin: 25px 0 15px; }
    .button {
      display: inline-block;
      padding: 12px 25px;
      background-color: #ffffff;
      color: #212121;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      font-size: 16px; /* fixed */
    }
    .button:hover { background-color: #e0e0e0; color: #000000; }
    .footer {
      margin-top: 30px;
      font-size: 13px; /* footer smaller */
      text-align: center;
      color: #aaaaaa;
      border-top: 1px solid #444;
      padding-top: 20px;
    }
    .highlight { color: #ffffff; font-weight: bold; }
    p { color: #f5f5f5; font-size:16px; line-height:24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="
        background-image: url('https://res.cloudinary.com/dftvlksve/image/upload/v1756129458/Image20250819174530_hjqear.jpg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        height: 110px;
        max-width: 350px;
        margin: 0 auto 15px;
      "></div>
      <h1>Buchung bestätigt! ✅</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hey ${userDetails.name || "Customer"},
      </div>
      
      <p>dein Walk Through ist erfolgreich gebucht. Hier findest du deine Buchungsdetails – jetzt heißt es: Stadt neu entdecken! </p>
      
      <div class="booking-card">
        <h3 class="deal-title">${dealDetails.title}</h3>
        
        <div class="booking-id-badge">Buchungs-ID: #${bookingDetails.bookingId.slice(
          -4
        )}</div>
        
        <div class="detail-row">
          <span class="detail-label">Datum:</span>
          <span class="highlight">${formattedDate}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Lokation:</span>
          <span>${dealDetails.location.city}, ${
    dealDetails.location.country
  }</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Preis:</span>
          <span class="highlight">$${dealDetails.price}</span>
        </div>
        
        <div class="description">
          ${dealDetails.description}
        </div>
      </div>
      
      <p>Falls du Fragen hast, melde dich gerne jederzeit bei uns.</p>
      
      <!-- Centered sign-off -->
        <p style="margin:24px 0 0; font-size:16px; color:#ffffff !important; text-align:center;">
        Viele Grüße<br/>Dein <strong>Walk Throughz</strong> Team
</p>
    </div>
  </div>
</body>
</html>
`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Buchungssystem"}" <${
      process.env.BOOKING_EMAIL_USER
    }>`,
    to,
    subject: `Buchungsbestätigung - ${dealDetails.title}`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

// import nodemailer from "nodemailer";

// export const sendBookingConfirmationEmail = async (
//   to: string,
//   bookingDetails: any,
//   dealDetails: any,
//   userDetails: any
// ) => {
//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const formattedDate = new Date(
//     bookingDetails.scheduleDate
//   ).toLocaleDateString("en-US", {
//     weekday: "long",
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   const htmlContent = `
// <!DOCTYPE html>
// <html>
// <head>
//   <style>
//     body {
//       font-family: 'Arial', sans-serif;
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
//       background-color: #212121;
//       color: #ffffff;
//       padding: 30px 20px;
//       text-align: center;
//       border-bottom: 1px solid #444;
//     }
//     .header h1 {
//       margin: 0;
//       font-size: 24px;
//       letter-spacing: 1px;
//     }
//     .content {
//       padding: 30px;
//     }
//     .greeting {
//       font-size: 18px;
//       margin-bottom: 20px;
//       color: #ffffff;
//     }
//     .booking-card {
//       background-color: #1a1a1a;
//       border-radius: 8px;
//       padding: 20px;
//       margin: 20px 0;
//       border-left: 4px solid #ffffff;
//     }
//     .deal-title {
//       color: #ffffff;
//       margin-top: 0;
//       font-size: 20px;
//     }
//     .detail-row {
//       margin-bottom: 10px;
//       display: flex;
//     }
//     .detail-label {
//       font-weight: bold;
//       min-width: 100px;
//       color: #cccccc;
//     }
//     .booking-id-badge {
//       background-color: #ffffff;
//       color: #212121;
//       padding: 8px 15px;
//       border-radius: 20px;
//       font-weight: bold;
//       font-size: 18px;
//       display: inline-block;
//       margin: 10px 0;
//       box-shadow: 0 2px 5px rgba(255,255,255,0.2);
//     }
//     .description {
//       margin: 15px 0;
//       line-height: 1.5;
//       color: #cccccc;
//     }
//     .button-container {
//       text-align: center;
//       margin: 25px 0 15px;
//     }
//     .button {
//       display: inline-block;
//       padding: 12px 25px;
//       background-color: #ffffff;
//       color: #212121;
//       text-decoration: none;
//       border-radius: 4px;
//       font-weight: bold;
//       transition: background-color 0.3s, color 0.3s;
//     }
//     .button:hover {
//       background-color: #e0e0e0;
//       color: #000000;
//     }
//     .footer {
//       margin-top: 30px;
//       font-size: 14px;
//       text-align: center;
//       color: #aaaaaa;
//       border-top: 1px solid #444;
//       padding-top: 20px;
//     }
//     .highlight {
//       color: #ffffff;
//       font-weight: bold;
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//       <h1>Buchung bestätigt! ✅</h1>
//     </div>

//     <div class="content">
//       <div class="greeting">
//         Hey  ${userDetails.name || "Customer"},
//       </div>

//       <p>dein Walk Throughz-Erlebnis ist erfolgreich gebucht!
// Hier findest du deine Buchungsdetails – jetzt heißt es: Stadt neu entdecken. 🏙️ </p>

//       <div class="booking-card">
//         <h3 class="deal-title">${dealDetails.title}</h3>

//         <div class="booking-id-badge">Booking ID:
//           #${bookingDetails.bookingId.slice(-4)}
//         </div>

//         <div class="detail-row">
//           <span class="detail-label">Schedule date:</span>
//           <span class="highlight">${formattedDate}</span>
//         </div>

//         <div class="detail-row">
//           <span class="detail-label">Location:</span>
//           <span>${dealDetails.location.city}, ${
//     dealDetails.location.country
//   }</span>
//         </div>

//         <div class="detail-row">
//           <span class="detail-label">Price:</span>
//           <span class="highlight">$${dealDetails.price}</span>
//         </div>

//         <div class="description">
//           ${dealDetails.description}
//         </div>
//       </div>

//       <p>Falls du Fragen hast, melde dich gerne jederzeit bei uns.</p>

//       <div class="button-container">
//         <a href="${
//           process.env.FRONTEND_URL || "https://yourwebsite.com"
//         }/bookings" class="button">
//           Deine Buchung ansehen
//         </a>
//       </div>

//       <div class="footer">
//         <p>Liebe Grüße </p>
//         <p>The ${process.env.APP_NAME || "Dein Walk Throughz-"} Team</p>
//       </div>
//     </div>
//   </div>
// </body>
// </html>
// `;

//   const mailOptions = {
//     from: `"${process.env.EMAIL_FROM_NAME || "Booking System"}" <${
//       process.env.EMAIL_USER
//     }>`,
//     to,
//     subject: `Booking Confirmation - ${dealDetails.title}`,
//     html: htmlContent,
//   };

//   await transporter.sendMail(mailOptions);
// };
