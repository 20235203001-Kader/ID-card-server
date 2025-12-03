const Student = require("../models/Student");

const addStudent = async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;

    let student = await Student.findOne({ email });
    if (!student) {
      student = await Student.create({ name, email, photoURL });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addStudent };
