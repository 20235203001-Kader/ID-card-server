const nodemailer = require("nodemailer");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

dotenv.config();
const app = express();

// ======================= Middleware =======================
console.log("🔄 Setting up middleware...");

// 1. CORS FIRST
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://bubtidcard.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// 2. BODY PARSERS - CRITICAL!
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// 3. STATIC FILES
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ======================= Payment Routes (INLINE) =======================
// Instead of importing, let's define payment routes directly in the main file

// Payment Model
const Payment = mongoose.model(
  "Payment",
  new mongoose.Schema({
    email: {
      type: String,
      required: true
    },
    trxId: {
      type: String,
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      default: "topup"
    },
    status: {
      type: String,
      default: "pending"
    },
    userInfo: {
      displayName: String,
      email: String,
      uid: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }, {
    collection: 'payments'
  })
);

// ✅ Payment Routes
app.get('/api/payments/test', (req, res) => {
  res.json({
    success: true,
    message: 'Payments route is working! 🎉',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/payments/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payments health check OK!',
    timestamp: new Date().toISOString()
  });
});

// ✅ Create new payment
app.post('/api/payments/create', async (req, res) => {
  try {
    console.log("📥 Received payment data:", req.body);
    
    // ✅ Proper destructuring with default values
    const { 
      email = '', 
      trxId = '', 
      amount = 0, 
      type = 'topup', 
      userInfo = {} 
    } = req.body;

    console.log("🔍 Parsed data:", { email, trxId, amount, type });

    // ✅ Enhanced validation
    if (!email || !trxId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Email, TRX ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // ✅ Check duplicate TRX ID
    const existingPayment = await Payment.findOne({ trxId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: 'This TRX ID is already used. Please use a different TRX ID.'
      });
    }

    // ✅ Create payment
    const payment = new Payment({
      email: email.trim(),
      trxId: trxId.trim(),
      amount: parseInt(amount),
      type: type,
      status: 'pending',
      userInfo: userInfo,
      createdAt: new Date()
    });

    await payment.save();
    console.log("✅ Payment saved to MongoDB:", payment._id);

    res.status(201).json({
      success: true,
      message: 'Payment request submitted successfully!',
      payment: {
        id: payment._id,
        trxId: payment.trxId,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Payment creation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'TRX ID already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// ✅ Get payment history for user
app.post('/api/payments/history', async (req, res) => {
  try {
    console.log("📥 Received history request:", req.body);
    
    const { email = '' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const payments = await Payment.find({ email: email.trim() })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`📊 Found ${payments.length} payments for ${email}`);

    res.json({
      success: true,
      payments: payments
    });

  } catch (error) {
    console.error('❌ Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// ======================= Multer Config =======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // ✅ 10MB limit
    fieldSize: 10 * 1024 * 1024 // ✅ ফর্ম ফিল্ডের সাইজ লিমিট
  }
});

// ======================= DB Connection =======================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/bubt-idcard");
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

// ======================= Models =======================
// Admin Model
const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
    resetTokenHash: String,
    resetTokenExpires: Date
  })
);

const Student = mongoose.model(
  "Student",
  new mongoose.Schema(
    {
      studentId: { type: String, required: true },
      cardType: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      program: { type: String, required: true },
      trxId: { type: String, required: true },
      amount: { type: String, required: true },
      paymentStatus: { type: String, default: "Pending" },
      requestType: { type: String, required: true },
      photo: String,
      gdCopy: String,
      oldIdImage: String,
      documents: [String],
      status: { type: String, default: "pending" },
      rejectionReason: String,
    },
    { timestamps: true }
  )
);

const Application = mongoose.model(
  "Application",
  new mongoose.Schema(
    {
      studentId: String,
      cardType: String,
      firstName: String,
      lastName: String,
      email: String,
      program: String,
      trxId: String,
      amount: String,
      paymentStatus: { type: String, default: "Approved" },
      requestType: String,
      photo: String,
      gdCopy: String,
      oldIdImage: String,
      documents: [String],
      approvedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
  )
);

// ======================= Helpers =======================
const createInitialAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({
      username: process.env.ADMIN_USERNAME,
    });
    if (!adminExists && process.env.ADMIN_PASSWORD && process.env.ADMIN_EMAIL) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
      });
      console.log("👑 Initial admin created");
    } else {
      console.log("✅ Admin already exists");
    }
  } catch (error) {
    console.error("❌ Admin creation error:", error.message);
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

// ======================= Debug Routes =======================
app.get("/api/debug", (req, res) => {
  res.json({
    success: true,
    message: "Debug endpoint is working!",
    server: "BUBT ID Card Server",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/api/students/debug", (req, res) => {
  res.json({
    success: true,
    message: "Student API endpoint is accessible!",
    endpoint: "POST /api/students",
    instructions: "Use POST method with form data to submit application",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/routes", (req, res) => {
  const routes = [
    { method: "GET", path: "/", description: "Root endpoint" },
    { method: "GET", path: "/api/health", description: "Health check" },
    { method: "GET", path: "/api/debug", description: "Debug endpoint" },
    { method: "GET", path: "/api/students/debug", description: "Student debug" },
    { method: "GET", path: "/api/routes", description: "All routes list" },
    { method: "POST", path: "/api/students", description: "Create student application" },
    { method: "POST", path: "/api/auth/login", description: "Admin login" },
    { method: "GET", path: "/api/admin/dashboard", description: "Admin dashboard" },
    { method: "GET", path: "/api/payments/test", description: "Payment test" },
    { method: "GET", path: "/api/payments/health", description: "Payment health" },
    { method: "POST", path: "/api/payments/create", description: "Create payment" },
    { method: "POST", path: "/api/payments/history", description: "Payment history" }
  ];
  
  res.json({
    success: true,
    message: "All available routes",
    routes: routes,
    timestamp: new Date().toISOString()
  });
});

// ======================= Routes =======================
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 BUBT ID Card Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: [
      "GET /",
      "GET /api/health", 
      "POST /api/students",
      "POST /api/auth/login",
      "GET /api/admin/dashboard",
      "GET /api/debug",
      "GET /api/students/debug",
      "GET /api/payments/test",
      "POST /api/payments/create"
    ]
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    time: new Date().toISOString(),
    server: "Render.com"
  });
});

// 🔐 Admin Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    console.log("[DEBUG] Login attempt for username:", username);
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      console.log("[DEBUG] No admin found for username:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log("[DEBUG] Password mismatch for:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "1h",
    });

    res.json({
      success: true,
      token,
      admin: { 
        id: admin._id, 
        username: admin.username,
        email: admin.email 
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📧 Forgot Password Route
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    console.log("📩 [DEBUG] /forgot-password called, body:", req.body);

    const { email } = req.body;
    if (!email) {
      console.log("❌ [DEBUG] Missing email in request body");
      return res.status(400).json({ error: "Email is required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log("⚠️ [DEBUG] No admin found with email:", email);
      return res.json({ 
        success: true,
        message: "If the email exists, a reset link will be sent." 
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    admin.resetTokenHash = tokenHash;
    admin.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await admin.save();
    
    console.log("✅ [DEBUG] Token saved to DB for admin:", admin.email);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    console.log("🔗 [DEBUG] Reset link:", resetLink);

    // Create transporter
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

    // Verify connection
    try {
      await transporter.verify();
      console.log("✅ [DEBUG] SMTP connection verified");
    } catch (vErr) {
      console.error("❌ [DEBUG] SMTP verification failed:", vErr);
      return res.status(500).json({ error: "Email service temporarily unavailable" });
    }

    // Send email
    const mailOptions = {
      from: `"BUBT ID Card System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request - BUBT ID Card System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested to reset your password for the BUBT ID Card System.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #6b7280;">BUBT ID Card Management System</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ [DEBUG] Password reset email sent. Message ID:", info.messageId);

    return res.json({ 
      success: true,
      message: "Password reset link has been sent to your email." 
    });
  } catch (error) {
    console.error("❌ [DEBUG] Forgot Password Error:", error);
    return res.status(500).json({ error: "Failed to process password reset request" });
  }
});

// 🔑 Reset Password Route
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.resetTokenHash || !admin.resetTokenExpires) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Check token expiry
    if (admin.resetTokenExpires < Date.now()) {
      return res.status(400).json({ error: "Reset token has expired" });
    }

    // Verify token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== admin.resetTokenHash) {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedPassword;
    admin.resetTokenHash = undefined;
    admin.resetTokenExpires = undefined;
    
    await admin.save();

    console.log("✅ [DEBUG] Password reset successful for:", email);

    res.json({ 
      success: true,
      message: "Password reset successfully. You can now login with your new password." 
    });
  } catch (error) {
    console.error("❌ [DEBUG] Reset Password Error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// 📝 Student: Submit Application
app.post(
  "/api/students",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "gdCopy", maxCount: 1 },
    { name: "oldIdImage", maxCount: 1 },
    { name: "documents", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      console.log("🎯 ========== NEW STUDENT APPLICATION ==========");
      console.log("📨 Received student application request");
      console.log("📝 Body fields:", Object.keys(req.body));
      console.log("📁 Files received:", req.files ? Object.keys(req.files) : "No files");

      // ✅ Parse form data properly
      const { 
        studentId, 
        cardType, 
        firstName, 
        lastName, 
        email, 
        program, 
        trxId, 
        amount, 
        requestType 
      } = req.body;

      console.log("🔍 Extracted data:", {
        studentId, firstName, lastName, email, trxId
      });

      // ✅ Enhanced validation
      const requiredFields = ['studentId', 'firstName', 'lastName', 'email', 'trxId'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        console.log("❌ Missing fields:", missingFields);
        return res.status(400).json({ 
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}` 
        });
      }

      // ✅ Process files safely
      const studentData = {
        studentId: studentId.trim(),
        cardType: cardType || "student",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        program: program || "Not Specified",
        trxId: trxId.trim(),
        amount: amount || "0",
        requestType: requestType || "new",
        status: "pending",
        paymentStatus: "Pending",
        // File handling with safety checks
        photo: req.files?.photo ? req.files.photo[0].filename : null,
        gdCopy: req.files?.gdCopy ? req.files.gdCopy[0].filename : null,
        oldIdImage: req.files?.oldIdImage ? req.files.oldIdImage[0].filename : null,
        documents: req.files?.documents ? req.files.documents.map(file => file.filename) : [],
      };

      console.log("💾 Prepared student data for saving:", studentData);

      // ✅ Save to database
      const student = new Student(studentData);
      await student.save();

      console.log("✅ Student application saved successfully! ID:", student._id);
      
      res.status(201).json({
        success: true,
        message: "Application submitted successfully!",
        data: {
          id: student._id,
          studentId: student.studentId,
          name: `${student.firstName} ${student.lastName}`,
          status: student.status,
          createdAt: student.createdAt
        }
      });

    } catch (error) {
      console.error("❌ STUDENT APPLICATION ERROR:", error);
      
      // ✅ Handle specific errors
      if (error.code === 11000) {
        const field = error.keyPattern?.studentId ? "Student ID" : "TRX ID";
        return res.status(400).json({ 
          success: false,
          error: `${field} already exists in our system` 
        });
      }
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          success: false,
          error: `Validation error: ${errors.join(', ')}` 
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: "Internal server error. Please try again later."
      });
    }
  }
);

// 📊 Admin Dashboard: Get Pending Applications
app.get("/api/admin/dashboard", authMiddleware, async (req, res) => {
  try {
    const pendingApplications = await Student.find({ status: "pending" }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        pendingApplications,
        totalPending: pendingApplications.length
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// 🔍 Fetch application by studentId
app.get("/api/admin/application/:studentId", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    let application = await Student.findOne({ studentId });
    if (!application) {
      application = await Application.findOne({ studentId });
    }
    
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error("Fetch application error:", error);
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

// ✅ Approve / ❌ Reject Application
app.post(
  "/api/admin/application/:id/action",
  authMiddleware,
  async (req, res) => {
    try {
      const { action, reason } = req.body;
      const { id } = req.params;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Valid action (approve/reject) is required" });
      }

      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (action === "approve") {
        // Move to approved applications
        await Application.create({
          studentId: student.studentId,
          cardType: student.cardType,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          program: student.program,
          trxId: student.trxId,
          amount: student.amount,
          paymentStatus: "Approved",
          requestType: student.requestType,
          photo: student.photo,
          gdCopy: student.gdCopy,
          oldIdImage: student.oldIdImage,
          documents: student.documents,
          approvedAt: new Date(),
        });

        // Remove from pending
        await Student.findByIdAndDelete(id);

        return res.json({ 
          success: true,
          message: "Application approved successfully" 
        });
      }

      if (action === "reject") {
        student.status = "rejected";
        if (reason) student.rejectionReason = reason;
        await student.save();

        return res.json({ 
          success: true,
          message: "Application rejected successfully" 
        });
      }

    } catch (error) {
      console.error("Application action error:", error);
      res.status(500).json({ error: "Failed to process application" });
    }
  }
);

// 📄 Approved Applications: For Student Dashboard
app.get("/api/applications", async (req, res) => {
  try {
    const { studentId, email } = req.query;
    
    let filter = {};
    if (studentId) filter.studentId = studentId;
    if (email) filter.email = email;

    const applications = await Application.find(filter).sort({ approvedAt: -1 });
    
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error("Fetch applications error:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Get all students (for admin)
app.get("/api/admin/students", authMiddleware, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// ======================= Error Handling =======================
// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      "GET /",
      "GET /api/health",
      "POST /api/students", 
      "POST /api/auth/login",
      "GET /api/admin/dashboard",
      "GET /api/debug",
      "GET /api/students/debug",
      "GET /api/payments/test",
      "POST /api/payments/create",
      "POST /api/payments/history"
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🔥 Unhandled error:", error);
  res.status(500).json({ 
    success: false,
    error: "Internal server error" 
  });
});

// ======================= Start Server =======================
const startServer = async () => {
  try {
    await connectDB();
    await createInitialAdmin();
    
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`🌐 Render: https://bubt-server.onrender.com`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('📋 Available Routes:');
      console.log('   GET  /');
      console.log('   GET  /api/health');
      console.log('   POST /api/students');
      console.log('   GET  /api/admin/dashboard');
      console.log('   POST /api/auth/login');
      console.log('   GET  /api/debug');
      console.log('   GET  /api/students/debug');
      console.log('   GET  /api/payments/test 🆕');
      console.log('   POST /api/payments/create 🆕');
      console.log('   POST /api/payments/history 🆕');
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();