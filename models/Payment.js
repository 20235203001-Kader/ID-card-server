const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model('Payment', paymentSchema);