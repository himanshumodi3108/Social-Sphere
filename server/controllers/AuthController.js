import UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { sendWelcomeMessage, sendOtpEmail, sendSms } from "../utils/mailService.js";
import { verifyTotp } from "../utils/totp.js";

// Helper to mask email for display
const maskEmail = (email) => {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  const visible = local.length > 2 ? local.substring(0, 2) + "***" : local[0] + "***";
  return `${visible}@${domain}`;
};

// Helper to mask phone for display
const maskPhone = (phone) => {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return "***" + cleaned;
  return "***" + cleaned.slice(-4);
};

// Register new user
export const registerUser = async (req, res) => {
  try {
    const { username, password, firstname, lastname, email, phone } = req.body;

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const normalizedPhone = phone ? phone.trim() : undefined;

    // Check if user already exists
    const queryConditions = [{ username: username.toLowerCase().trim() }];
    if (normalizedEmail) queryConditions.push({ email: normalizedEmail });
    if (normalizedPhone) queryConditions.push({ phone: normalizedPhone });

    const oldUser = await UserModel.findOne({ $or: queryConditions });

    if (oldUser) {
      if (oldUser.username === username.toLowerCase().trim()) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (normalizedEmail && oldUser.email === normalizedEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      if (normalizedPhone && oldUser.phone === normalizedPhone) {
        return res.status(400).json({ message: "Phone number already registered" });
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
      email: normalizedEmail,
      phone: normalizedPhone,
      emailVerified: false,
      phoneVerified: false,
      mfa: {
        enabled: false,
        method: normalizedEmail ? 'email' : 'phone',
      },
    });

    const user = await newUser.save();

    logger.info("User registered successfully", {
      userId: user._id,
      username: user.username,
      hasEmail: Boolean(user.email),
      hasPhone: Boolean(user.phone),
    });

    // Send Welcome message asynchronously without blocking registration response
    sendWelcomeMessage({
      to: user.email,
      phone: user.phone,
      name: user.firstname,
    }).catch((err) => {
      logger.warn("Failed to dispatch welcome notification", { error: err.message });
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
      stack: error.stack,
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

    const cleanUsername = username.toLowerCase().trim();
    // Allow login by username or registered email
    const user = await UserModel.findOne({
      $or: [{ username: cleanUsername }, { email: cleanUsername }],
    });

    if (!user) {
      logger.warn("Login attempt with invalid username/email", { username });
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const validity = await bcrypt.compare(password, user.password);

    if (!validity) {
      logger.warn("Login attempt with invalid password", {
        userId: user._id,
        username: user.username,
      });
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check if MFA is enabled for this user
    if (user.mfa && user.mfa.enabled) {
      const method = user.mfa.method || "email";

      if (method === "totp") {
        return res.status(200).json({
          mfaRequired: true,
          tempUserId: user._id,
          method: "totp",
          message: "Please enter the 6-digit code from your Authenticator app.",
        });
      }

      // Generate 6-digit code for Email or Phone OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.mfa.otpCode = otpCode;
      user.mfa.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      let destination = "";
      if (method === "email") {
        if (!user.email) {
          return res.status(400).json({
            message: "MFA is configured for email, but no email is linked to this account.",
          });
        }
        destination = maskEmail(user.email);
        await sendOtpEmail({
          to: user.email,
          name: user.firstname,
          code: otpCode,
          purpose: "Two-Factor Authentication",
        });
      } else if (method === "phone") {
        if (!user.phone) {
          return res.status(400).json({
            message: "MFA is configured for phone, but no phone number is linked to this account.",
          });
        }
        destination = maskPhone(user.phone);
        await sendSms({
          to: user.phone,
          message: `Your SocialSphere 2FA verification code is: ${otpCode}. Valid for 10 minutes.`,
        });
      }

      return res.status(200).json({
        mfaRequired: true,
        tempUserId: user._id,
        method,
        destination,
        message: `A verification code has been sent to your registered ${method === "email" ? "email" : "phone number"}.`,
      });
    }

    logger.info("User logged in successfully", {
      userId: user._id,
      username: user.username,
    });

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

// Verify MFA during login challenge
export const verifyLoginMfa = async (req, res) => {
  try {
    const { tempUserId, code } = req.body;

    const user = await UserModel.findById(tempUserId);
    if (!user || !user.mfa || !user.mfa.enabled) {
      return res.status(400).json({ message: "Invalid or expired MFA session. Please log in again." });
    }

    const method = user.mfa.method || "email";
    let isValid = false;

    if (method === "totp") {
      isValid = verifyTotp(user.mfa.totpSecret, code);
    } else {
      const now = new Date();
      if (
        user.mfa.otpCode &&
        user.mfa.otpCode.trim() === code.trim() &&
        user.mfa.otpExpires &&
        user.mfa.otpExpires > now
      ) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    // Clear one-time OTP
    user.mfa.otpCode = undefined;
    user.mfa.otpExpires = undefined;
    await user.save();

    logger.info("User completed MFA challenge successfully", {
      userId: user._id,
      method,
    });

    const token = jwt.sign(
      { username: user.username, id: user._id },
      process.env.JWTKEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    const { password: _, ...userWithoutPassword } = user._doc;
    res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    logger.error("Error verifying login MFA", { error: error.message });
    res.status(500).json({ message: "MFA verification failed. Please try again." });
  }
};

// Forgot Password - Initiate Reset
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;
    const clean = identifier.toLowerCase().trim();

    const user = await UserModel.findOne({
      $or: [{ username: clean }, { email: clean }],
    });

    if (!user) {
      return res.status(404).json({
        message: "No account found matching this username or email address.",
      });
    }

    if (!user.email && !user.phone) {
      return res.status(400).json({
        message: "No email or phone number is linked to this account. Please contact administrator.",
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    let sentDestination = "";
    if (user.email) {
      sentDestination = maskEmail(user.email);
      await sendOtpEmail({
        to: user.email,
        name: user.firstname,
        code: resetCode,
        purpose: "Password Reset Request",
      });
    } else if (user.phone) {
      sentDestination = maskPhone(user.phone);
      await sendSms({
        to: user.phone,
        message: `Your SocialSphere password reset code is: ${resetCode}. Valid for 15 minutes.`,
      });
    }

    res.status(200).json({
      message: `A 6-digit reset code has been sent to ${sentDestination}.`,
      destination: sentDestination,
      username: user.username,
    });
  } catch (error) {
    logger.error("Error initiating forgot password", { error: error.message });
    res.status(500).json({ message: "Failed to send reset code. Please try again." });
  }
};

// Reset Password - Verify Code and Update Password
export const resetPassword = async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;
    const clean = identifier.toLowerCase().trim();

    const user = await UserModel.findOne({
      $or: [{ username: clean }, { email: clean }],
    });

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const now = new Date();
    if (
      !user.resetPasswordOtp ||
      user.resetPasswordOtp.trim() !== String(code).trim() ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < now
    ) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(newPassword, salt);

    user.password = hashedPass;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info("Password reset successfully for user", { userId: user._id, username: user.username });
    res.status(200).json({ message: "Your password has been successfully reset! You can now log in." });
  } catch (error) {
    logger.error("Error resetting password", { error: error.message });
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
};
