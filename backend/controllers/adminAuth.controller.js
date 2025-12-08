import jwt from "jsonwebtoken";
import Admin from "../models/adminSchema.js";
import Section from "../models/sectionSchema.js";
import Station from "../models/stationSchema.js";
import Tracks from "../models/trackSchema.js";
import Edge from "../models/edgeSchema.js";
import Node from "../models/nodeSchema.js";
import Train from "../models/trainSchema.js";


// ------------------ LOGIN ADMIN ------------------
export const loginAdmin = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ msg: "Request body missing" });
    }

    const { id, password } = req.body;
    console.log("Login attempt for:", id);

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
        name: admin.name,
        role: admin.role,
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
      console.log("Section Admin login - sectionId:", admin.sectionId);

      try {
        // Step 1: Fetch section
        // Step 2: Populate tracks
        // Step 3: Populate nodes and edges inside each track
        const section = await Section.findOne({ section_id: admin.sectionId })
          .populate({
            path: "tracks",
            model: "Tracks",
            populate: [
              {
                path: "nodes",
                model: "Node"
              },
              {
                path: "edges",
                model: "Edge"
              }
            ]
          })
          .populate({
            path: "stations",
            model: "Station",
            populate: [
              {
                path: "startNode",
                model: "Node"
              },
              {
                path: "endNode",
                model: "Node"
              }
            ]
          });

        if (!section) {
          return res.status(404).json({ msg: "Section information not found" });
        }

        // Fetch all trains
        const trains = await Train.find();

        responsePayload.sectionData = section;
        responsePayload.trains = trains;

        // Summary for debugging
        console.log("Section loaded:", section.name);
        console.log("Tracks count:", section.tracks?.length || 0);
        console.log("Stations count:", section.stations?.length || 0);
        console.log("Trains count:", trains?.length || 0);

        return res.status(200).json({
          msg: "Section Admin login successful",
          ...responsePayload
        });

      } catch (error) {
        console.error("Error fetching section data:", error);
        return res.status(500).json({ msg: "Error fetching section data" });
      }
    }



    // ====== STATION ADMIN LOGIN ======
    if (!isSectionAdmin) {
      try {
        const station = await Station.findOne({ stationId: admin.stationId })
          .populate("startNode")
          .populate("endNode");

        if (!station) {
          return res.status(404).json({ msg: "Station data not found" });
        }

        // Fetch section info with tracks populated
        const section = await Section.findById(station.sectionId)
          .populate({
            path: "tracks",
            model: "Tracks",
            populate: [
              {
                path: "nodes",
                model: "Node"
              },
              {
                path: "edges",
                model: "Edge"
              }
            ]
          })
          .populate("stations");

        // Get other stations (excluding current one)
        const otherStations = section?.stations
          ?.filter(s => s._id.toString() !== station._id.toString())
          ?.map(s => ({
            id: s._id,
            stationId: s.stationId,
            stationName: s.stationName
          })) || [];

        // Fetch all trains
        const trains = await Train.find();

        responsePayload.stationData = station;
        responsePayload.sectionId = station.sectionId;
        responsePayload.sectionData = section;
        responsePayload.otherStations = otherStations;
        responsePayload.trains = trains;

        console.log("Station login:", station.stationName);

        return res.status(200).json({
          msg: "Station Admin login successful",
          ...responsePayload
        });

      } catch (error) {
        console.error("Error fetching station data:", error);
        return res.status(500).json({ msg: "Error fetching station data" });
      }
    }

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ msg: "Server error" });
  }
};


// ------------------ GET SECTION DATA (with full population) ------------------
export const getSectionData = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Fetch section → populate tracks → populate nodes + edges in tracks
    const section = await Section.findOne({ section_id: sectionId })
      .populate({
        path: "tracks",
        model: "Tracks",
        populate: [
          {
            path: "nodes",
            model: "Node"
          },
          {
            path: "edges",
            model: "Edge"
          }
        ]
      })
      .populate({
        path: "stations",
        model: "Station",
        populate: [
          {
            path: "startNode",
            model: "Node"
          },
          {
            path: "endNode",
            model: "Node"
          }
        ]
      });

    if (!section) {
      return res.status(404).json({ msg: "Section not found" });
    }

    const trains = await Train.find();

    return res.status(200).json({
      msg: "Section data fetched successfully",
      sectionData: section,
      trains
    });

  } catch (error) {
    console.error("Get Section Error:", error);
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
