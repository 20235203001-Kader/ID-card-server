// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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

// ✅ Create new payment
router.post('/create', async (req, res) => {
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
router.post('/history', async (req, res) => {
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

// ✅ Get all payments (for admin)
router.get('/all', async (req, res) => {
  try {
    const payments = await Payment.find({})
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments,
      total: payments.length
    });

  } catch (error) {
    console.error('❌ Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ✅ Update payment status (for admin)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      payment
    });

  } catch (error) {
    console.error('❌ Payment status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ✅ Health check for payments route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payments route is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;