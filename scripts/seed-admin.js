import { connectDB } from "../lib/mongodb.js"
import { hashPassword } from "../lib/auth.js"
import { createAdmin, findAllAdmins } from "../lib/models/admin.js"

async function seedAdmin() {
  try {
    await connectDB()

    const existingAdmins = await findAllAdmins()
    if (existingAdmins.length > 0) {
      console.log("Admin users already exist:")
      existingAdmins.forEach((admin) => {
        console.log(`- ${admin.email} (ID: ${admin._id})`)
      })
      return
    }

    const hashedPassword = await hashPassword("admin123")

    const admin = await createAdmin({
      username: "admin",
      email: "admin@railway.com",
      passwordHash: hashedPassword,
    })

    console.log("Admin user created successfully:", {
      id: admin._id,
      email: admin.email,
      username: admin.username,
    })

    console.log("\nLogin credentials:")
    console.log("Email: admin@railway.com")
    console.log("Password: admin123")
  } catch (error) {
    console.error("Error creating admin user:", error)
  }
}

seedAdmin()
