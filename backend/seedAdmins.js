// seed/seedAdmins.js

import mongoose from "mongoose";
import Admin from "./models/adminSchema.js";       // Make sure file name matches
// Updated name
import { config as configDotenv } from "dotenv"
configDotenv()

const MONGO = process.env.MongoUrl;

async function seedAdmins() {
  try {
    await mongoose.connect(MONGO);
    console.log("Connected to DB");

    // Find the large section that was created earlier





    // -----------------------------------------
    // DELETE OLD ADMINS
    // -----------------------------------------
    await Admin.deleteMany({});
    console.log("🗑️ Deleted all previous admins");


    // -----------------------------------------
    // CREATE NEW ADMINS
    // -----------------------------------------
    const adminsToCreate = [
      {
        email: "bhs@section.com",
        password: "123456",
        stationId: "bhs",
        twoFa: false
      },
      {
        email: "sori@section.com",
        password: "123456",
        stationId: "sori",
        twoFa: false
      },
      {
        email: "sumr@section.com",
        password: "123456",
        stationId: "sumr",
        twoFa: false
      },
      {
        email: "glg@section.com",
        password: "123456",
        stationId: "glg",
        twoFa: false
      },
      {
        email: "pai@section.com",
        password: "123456",
        stationId: "pai",
        twoFa: false
      },
      {
        email: "bsq@section.com",
        password: "123456",
        stationId: "bsq",
        twoFa: false
      }
    ];

    for (const adminData of adminsToCreate) {
      const admin = new Admin(adminData);
      await admin.save(); // password hashing happens automatically
      console.log("✔ Created admin:", admin.email);
    }

    console.log("\n🎉 Admin seeding complete!");
    process.exit();

  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

seedAdmins();
