import UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

// Register new user
export const registerUser = async (req, res) => {
  try {
    const { username, password, firstname, lastname, email } = req.body;

    // Check if user already exists
    const oldUser = await UserModel.findOne({ 
      $or: [
        { username: username.toLowerCase() },
        ...(email ? [{ email: email.toLowerCase() }] : [])
      ]
    });

    if (oldUser) {
      if (oldUser.username === username.toLowerCase()) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (email && oldUser.email === email.toLowerCase()) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new UserModel({
      username: username.toLowerCase().trim(),
      password: hashedPass,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      emailVerified: false, // Email verification can be added later
    });

    const user = await newUser.save();
    
    logger.info('User registered successfully', { 
      userId: user._id, 
      username: user.username 
    });

    const token = jwt.sign(
      { username: user.username, id: user._id },
      process.env.JWTKEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    const { password: _, ...userWithoutPassword } = user._doc;
    res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    logger.error("Error registering user", { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ message: error.message || "Failed to register user" });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await UserModel.findOne({ username: username.toLowerCase() });

    if (!user) {
      logger.warn('Login attempt with invalid username', { username });
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const validity = await bcrypt.compare(password, user.password);

    if (!validity) {
      logger.warn('Login attempt with invalid password', { userId: user._id, username });
      return res.status(401).json({ message: "Invalid username or password" });
    }

    logger.info('User logged in successfully', { userId: user._id, username: user.username });

    const token = jwt.sign(
      { username: user.username, id: user._id },
      process.env.JWTKEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    const { password: _, ...userWithoutPassword } = user._doc;
    res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    logger.error("Error during login", { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};
