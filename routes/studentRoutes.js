const express = require("express");
const multer = require("multer");
const Student = require("../models/Student");

const router = express.Router();

// Multer memory storage (we store files in DB, so memory is fine)
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "gdCopy", maxCount: 1 },
    { name: "oldIdImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Debugging
      console.log("Form Data:", req.body);
      console.log("Files:", req.files);

      // Prepare data object
      const data = {
        studentId: req.body.studentId,
        cardType: req.body.cardType,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        program: req.body.program,
        trxId: req.body.trxId,
        amount: req.body.amount,
        requestType: req.body.requestType,
        status: "pending", // default status
        // Store files as Buffer
        photo: req.files.photo ? req.files.photo[0].buffer : null,
        gdCopy: req.files.gdCopy ? req.files.gdCopy[0].buffer : null,
        oldIdImage: req.files.oldIdImage ? req.files.oldIdImage[0].buffer : null,
      };

      const student = new Student(data);
      await student.save();

      res.status(201).json({
        message: "Student request saved successfully",
        student,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
