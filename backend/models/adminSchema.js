// models/Admin.js

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const AdminSchema = new mongoose.Schema({
  sectionId: {
    type: String,

  },
  stationId: {
    type: String,


  },
  isAdmin: {
    type: Boolean,
    default: false
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  twoFa: {
    type: Boolean,
    default: false
  },

  lastLogin: {
    type: Date,
    default: null
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
      sectionId: this.sectionId
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

const Admin = mongoose.model("Admin", AdminSchema);
export default Admin;
