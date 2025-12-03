// test.js - Emergency fix
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ সব routes একসাথে
app.get("/", (req, res) => {
  res.json({ message: "BUBT Server - TEST VERSION", status: "OK" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", database: "Connected" });
});

app.get("/api/debug", (req, res) => {
  res.json({ message: "Debug route is WORKING!" });
});

app.get("/api/students/debug", (req, res) => {
  res.json({ message: "Student debug route is WORKING!" });
});

app.post("/api/students", (req, res) => {
  res.json({ 
    success: true, 
    message: "Student application received (TEST)",
    data: req.body 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});