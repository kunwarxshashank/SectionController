import jwt from "jsonwebtoken";
import Admin from "../models/adminSchema.js";

export  const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify Access Token
    const decoded = jwt.verify(token, process.env.ATS);

    // Check if admin exists
    const admin = await Admin.findById(decoded._id);
    if (!admin) {
      return res.status(401).json({ msg: "Admin not found" });
    }

    req.admin = admin; // attach full admin object
    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Access token expired" });
    }

    return res.status(401).json({ msg: "Invalid or malformed token" });
  }
};
