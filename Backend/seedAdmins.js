// seed/seedAdmins.js

import mongoose from "mongoose";
import Admin from "./models/adminSchema.js";       // Make sure file name matches
import Section from "./models/sectionSchema.js";   // Updated name

const MONGO = "mongodb://127.0.0.1:27017/railway-demo";

async function seedAdmins() {
  try {
    await mongoose.connect(MONGO);
    console.log("Connected to DB");

    // Find the large section that was created earlier
    const section = await Section.findOne({ section_id: "SEC_LARGE_01" });

    if (!section) {
      console.log("❌ ERROR: Section SEC_LARGE_01 not found!");
      console.log("➡️ Run seedLargeSection.js first.");
      process.exit();
    }

    console.log("Using section:", section.name);

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
        email: "admin1@section.com",
        password: "123456",
        sectionId: section._id,
        twoFa: false
      },
      {
        email: "admin2@section.com",
        password: "123456",
        sectionId: section._id,
        twoFa: false
      },
      {
        email: "admin3@section.com",
        password: "123456",
        sectionId: section._id,
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
