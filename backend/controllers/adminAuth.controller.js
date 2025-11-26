
import jwt from "jsonwebtoken";
import Admin from "../models/adminSchema.js";

export const loginAdmin = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        msg: "Request body is missing. Ensure Content-Type is application/json"
      });
    }

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        msg: "Email and password are required"
      });
    }

    // 1) Check if email exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ msg: "Admin not found" });
    }

    // 2) Compare password
    const isCorrect = await admin.isPasswordCorrect(password);
    if (!isCorrect) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    // 3) Generate tokens
    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    // 4) Update last login time
    admin.lastLogin = new Date();
    await admin.save();

    // 5) Return successful login
    res.status(200).json({
      msg: "Login successful",
      admin: {
        id: admin._id,
        email: admin.email,
        sectionId: admin.sectionId
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};


export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ msg: "Refresh Token missing" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.RTS);

    const admin = await Admin.findById(decoded._id);
    if (!admin) {
      return res.status(401).json({ msg: "Admin not found" });
    }

    // Generate new access token
    const newAccessToken = admin.generateAccessToken();

    return res.status(200).json({
      msg: "New access token generated",
      accessToken: newAccessToken
    });

  } catch (err) {
    console.error(err);

    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ msg: "Refresh token expired. Login again." });
    }

    return res.status(403).json({ msg: "Invalid refresh token" });
  }
};
