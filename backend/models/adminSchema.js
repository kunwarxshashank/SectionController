// models/Admin.js

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const AdminSchema = new mongoose.Schema({
  // Admin can be either Section Admin or Station Admin
  sectionId: {
    type: String,
    default: null
  },
  
  stationId: {
    type: String,
    default: null
  },

  // Role type for easy identification
  role: {
    type: String,
    enum: ["section_admin", "station_admin", "super_admin"],
    default: "station_admin"
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  twoFa: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before save
AdminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Password compare method
AdminSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Generate access token
AdminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      sectionId: this.sectionId,
      stationId: this.stationId,
      role: this.role
    },
    process.env.ATS,
    { expiresIn: "15m" }
  );
};

// Generate refresh token
AdminSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email
    },
    process.env.RTS,
    { expiresIn: "7d" }
  );
};

// Check if admin is section admin
AdminSchema.methods.isSectionAdmin = function () {
  return this.role === "section_admin" || this.sectionId !== null;
};

const Admin = mongoose.model("Admin", AdminSchema);
export default Admin;
