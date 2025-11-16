import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const secret = process.env.JWTKEY;

const authMiddleWare = async (req, res, next) => {
  try {
    // Check if authorization header exists
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "No authorization token provided" });
    }

    const token = req.headers.authorization.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Invalid authorization format" });
    }

    // Verify token
    const decoded = jwt.verify(token, secret);
    req.body._id = decoded?.id;
    req.userId = decoded?.id; // Also set on req object for easier access
    
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token. Please log in again." });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired. Please log in again." });
    }
    
    console.log("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export default authMiddleWare;
