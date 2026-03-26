require("dotenv").config();
const mongoose = require("mongoose");
const UserModel = require("../models/user.model");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("🚀 Database connected for seeding...");

    const adminExists = await UserModel.findOne({ role: "superadmin" });

    if (adminExists) {
      console.log("⚠️ Superadmin already exists.");
      process.exit(0);
    }

    const adminData = {
      role: "superadmin",

      title: "Mr",
      firstname: "Super",
      surname: "Admin",

      email: "superadmin@sproutogo.com",
      password: "superadmin@",

      company: {
        name: "Sprouto Go",
        number: "00000000",
      },

      address: {
        line1: "Head Office",
        county: "N/A",
        city: "N/A",
        postcode: "0000",
      },

      subscription: {
        plan: "pro",
        billingCycle: "annually",
      },
    };

    await UserModel.create(adminData);

    console.log("✅ Superadmin Seeded Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
