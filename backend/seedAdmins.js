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
    console.log("🗑️ Deleted all previous admins from db");


    // -----------------------------------------
    // CREATE NEW ADMINS
    // -----------------------------------------
    const adminsToCreate = [
      {
        email: "bplbina@section.com",
        name: "BPL Bina",
        password: "123456",
        sectionId: "bplbina",
        twoFa: false
      },
      {
        email: "vidisha@section.com",
        name: "Vidisha",
        password: "123456",
        stationId: "vidisha",
        twoFa: false
      },
      {
        email: "sorai@section.com",
        name: "Sorai",
        password: "123456",
        stationId: "sorai",
        twoFa: false
      },
      {
        email: "sumer@section.com",
        name: "Sumer",
        password: "123456",
        stationId: "sumer",
        twoFa: false
      },
      {
        email: "gulabganj@section.com",
        name: "Gulabganj",
        password: "123456",
        stationId: "gulabganj",
        twoFa: false
      },
      {
        email: "pabai@section.com",
        name: "Pabai",
        password: "123456",
        stationId: "pabai",
        twoFa: false
      },
      {
        email: "ganjbasoda@section.com",
        name: "Ganj Basoda",
        password: "123456",
        stationId: "ganjbasoda",
        twoFa: false
      },
     
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
