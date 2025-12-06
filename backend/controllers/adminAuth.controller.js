import jwt from "jsonwebtoken";
import Admin from "../models/adminSchema.js";
import Section from "../models/sectionSchema.js";
import Station from "../models/stationSchema.js";
import Track from "../models/trackSchema.js";
import Edge from "../models/edgeSchema.js";
import Node from "../models/nodeSchema.js";


// ------------------ LOGIN ADMIN ------------------
export const loginAdmin = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ msg: "Request body missing" });
    }

    const { id, password } = req.body;
    console.log(id, password);

    if (!id || !password) {
      return res.status(400).json({ msg: "ID and password are required" });
    }

    // ------------------ 1) FIND ADMIN ------------------
    let admin = await Admin.findOne({ sectionId: id });
    let isSectionAdmin = true;

    if (!admin) {
      admin = await Admin.findOne({ stationId: id });
      isSectionAdmin = false;
    }




    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    // ------------------ 2) VERIFY PASSWORD ------------------
    const isCorrect = await admin.isPasswordCorrect(password);
    if (!isCorrect) {
      return res.status(401).json({ msg: "Invalid password" });
    }

    // ------------------ 3) GENERATE TOKENS ------------------
    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    // ------------------ 4) UPDATE LAST LOGIN ------------------
    admin.lastLogin = new Date();
    await admin.save();
    let responsePayload = {
      admin: {
        _id: admin._id,
        email: admin.email,
        isSectionAdmin,
        sectionId: admin.sectionId,
        stationId: admin.stationId
      },
      accessToken,
      refreshToken
    };

    // ------------------ 5) FETCH EXTRA DATA BASED ON ROLE ------------------
    // ====== SECTION ADMIN LOGIN ======

    if (isSectionAdmin) {
      const section = await Section.findById(admin.sectionId)
        .populate({
          path: "stations",
          model: "Station",
        })
        .populate({
          path: "tracks",
          model: "Tracks",
          populate: [
            { path: "edges", model: "Edge" },
            { path: "nodes", model: "Node" }
          ]
        });

      if (!section) {
        return res.status(404).json({ msg: "Section information not found" });
      }

      responsePayload.sectionData = section;
      return res.status(200).json({
        msg: "Section Admin login successful",
        ...responsePayload
      });
    }



    // ====== STATION ADMIN LOGIN ======
    if (!isSectionAdmin) {
      const station = await Station.findOne({ stationId: admin.stationId })
        .populate({
          path: "totalTracks",
          populate: {
            path: "",
            model: "Edge"
          }
        })
        .populate("nodes")

      if (!station) {
        return res.status(404).json({ msg: "Station data not found" });
      }

      // fetch section info to get OTHER stations (for redux)
      const section = await Section.findById(station.sectionId)
        .populate("stations");

      responsePayload.stationData = station;
      responsePayload.sectionId = station.sectionId;
      responsePayload.otherStations = section.stations
        .filter(s => s._id.toString() !== station._id.toString())
        .map(s => ({
          id: s._id,
          stationName: s.stationName
        }));

      return res.status(200).json({
        msg: "Station Admin login successful",
        ...responsePayload
      });
    }

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ msg: "Server error" });
  }
};


// ------------------ REFRESH ACCESS TOKEN ------------------
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ msg: "Refresh token missing" });
    }

    // 1) Verify token
    const decoded = jwt.verify(refreshToken, process.env.RTS);

    // 2) Check admin exists
    const admin = await Admin.findById(decoded._id);
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    // 3) Generate new Access Token
    const newAccessToken = admin.generateAccessToken();

    return res.status(200).json({
      msg: "New access token generated",
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error("Refresh Token Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ msg: "Refresh token expired. Login again." });
    }

    return res.status(403).json({ msg: "Invalid refresh token" });
  }
};
