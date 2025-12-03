const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: String,
  cardType: String,
  firstName: String,
  lastName: String,
  email: String,
  program: String,
  trxId: String,
  amount: String,
  requestType: String,
  status: { type: String, default: "pending" },
  photo: Buffer,
  gdCopy: Buffer,
  oldIdImage: Buffer,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Student", studentSchema);
