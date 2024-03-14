const express = require("express");
const router = express.Router();
const User = require("../models/user");

//const saltRounds = 10;

router.post("/signup", async (req, res) => {
  const { userId, password, apiKey, totpKey } = req.body;

  try {
    //const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Use the create method to simplify creating a new user instance with hashed password
    await User.create({ userId, password, apiKey, totpKey });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    console.log(userId);
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password === user.password) {
      return res.status(200).json({ message: "Login successful" });
    } else {
      return res.status(401).json({ message: "Invalid password" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
