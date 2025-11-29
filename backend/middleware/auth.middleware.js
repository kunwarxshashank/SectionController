import jwt from "jsonwebtoken";
import Admin from "../models/adminSchema.js";

export const verifyJWT = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - No token provided"
            });
        }

        const decoded = jwt.verify(token, process.env.ATS);
        const admin = await Admin.findById(decoded._id).select("-password");

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Invalid token"
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Invalid token"
        });
    }
};
