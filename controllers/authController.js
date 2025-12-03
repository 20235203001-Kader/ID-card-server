const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const successfulResponse = () => {
        toast.success("✅ Password reset successful! Redirecting to login...", {
        position: "top-center",
        autoClose: 3000,
      });
}

/**
 * ==========================
 * 🔐 ADMIN LOGIN
 * ==========================
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: "Invalid credentials." });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid credentials." });

    // ✅ Generate JWT
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ error: "Server error during login." });
  }
};

/**
 * ==========================
 * 🚪 LOGOUT (Handled client-side)
 * ==========================
 */
exports.logout = async (req, res) => {
  res.json({ message: "Logged out successfully." });
};

/**
 * ==========================
 * ✉️ FORGOT PASSWORD
 * ==========================
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required." });

    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Security: Do not reveal whether email exists
      return res.json({
        message: "If the email exists, a reset link was sent.",
      });
    }

    // 🔹 Generate Token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    admin.resetTokenHash = tokenHash;
    admin.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await admin.save();

    // 🔹 Reset Link
    const resetLink = `${
      process.env.FRONTEND_URL
    }/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // 🔹 Nodemailer Transport (Brevo SMTP)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"BUBT Admin Panel" <20235203016@cse.bubt.edu.bd>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f9;border-radius:10px;font-family:Segoe UI,Arial,sans-serif;box-shadow:0 2px 8px #0001;">
          <div style="text-align:center;">
            <img src="https://mir-s3-cdn-cf.behance.net/project_modules/fs/ed535353880001.594443e25ce53.png" alt="BUBT Logo" style="width:64px;height:64px;margin-bottom:12px;" />
            <h2 style="color:#1a237e;margin-bottom:8px;">Password Reset Request</h2>
          </div>
          <p style="font-size:16px;color:#333;margin-bottom:24px;">
            Hello,<br>
            We received a request to reset your password for your BUBT Admin account.<br>
            Click the button below to reset your password. This link is valid for <b>1 hour</b>.
          </p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#1a237e;color:#fff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;letter-spacing:1px;">
              Reset Password
            </a>
          </div>
          <p style="font-size:14px;color:#555;">
            If you did not request a password reset, you can safely ignore this email.<br>
            <span style="color:#888;">BUBT Admin Panel</span>
          </p>
          <hr style="margin:32px 0 12px 0;border:none;border-top:1px solid #eee;">
          <div style="font-size:12px;color:#aaa;text-align:center;">
            &copy; ${new Date().getFullYear()} BUBT. All rights reserved.
          </div>
        </div>
      `,
    });

    res.json({ message: "If the email exists, a reset link was sent." });
  } catch (error) {
    console.error("❌ Forgot Password Error:", error);
    res.status(500).json({ error: "Server error while sending reset email." });
  }
};

/**
 * ==========================
 * 🔁 RESET PASSWORD
 * ==========================
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "Invalid request data." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      email,
      resetTokenHash: tokenHash,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ error: "Invalid or expired token." });
    }

    // // 🔹 Hash and update password
    // const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = newPassword;
    admin.resetTokenHash = undefined;
    admin.resetTokenExpires = undefined;

    await admin.save();
 console.log("✅ New hashed password saved for:", admin.email);
    successfulResponse();
    res.json({
      message:
        "Password reset successful! Please login with your new password.",
    });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({ error: "Server error during password reset." });
  }
};
