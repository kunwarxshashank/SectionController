import StationLayout from "../models/stationLayout.js";

// ---------------- Add or Update Station Layout ----------------
export const createOrUpdateStationLayout = async (req, res) => {
  try {
    const data = req.body;

    if (!data.station_name) {
      return res.status(400).json({
        success: false,
        message: "station_name is required"
      });
    }

    // If station already exists → update it  
    const existing = await StationLayout.findOne({ station_name: data.station_name });

    let saved;
    if (existing) {
      existing.set(data);
      saved = await existing.save();
    } else {
      saved = await StationLayout.create(data);
    }

    return res.status(200).json({
      success: true,
      message: "Station layout saved successfully",
      layout: saved
    });

  } catch (error) {
    console.error("Station Layout Save Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving station layout",
      error: error.message
    });
  }
};


// ---------------- Get Station Layout by Name ----------------
export const getStationLayout = async (req, res) => {
  try {
    const { station_name } = req.params;

    const layout = await StationLayout.findOne({ station_name });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: "Station layout not found"
      });
    }

    return res.status(200).json({
      success: true,
      layout
    });

  } catch (error) {
    console.error("Get Layout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching station layout",
      error: error.message
    });
  }
};
