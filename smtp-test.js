const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

(async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP Connection OK");

    const info = await transporter.sendMail({
      from: `"Test Mail" <${process.env.SMTP_USER}>`,
      to: "muhammadtanvirahmedrume@gmail.com", 
      subject: "Brevo SMTP Test",
      text: "If you received this, Brevo SMTP is working fine!",
    });

    console.log("✅ Mail sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error:", error);
  }
})();
