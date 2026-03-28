require("dotenv").config();
const mongoose = require("mongoose");
const UserModel = require("../models/user.model");

const seedDeveloper = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("🚀 Database connected for seeding...");

    const developerExists = await UserModel.findOne({ role: "developer" });

    if (developerExists) {
      console.log("⚠️ Developer already exists.");
      process.exit(0);
    }

    const developerData = {
      role: "developer",

      title: "Mr",
      firstname: "Dev",
      surname: "User",

      email: "developer@sproutogo.com",
      password: "developer@",

      company: {
        name: "Sprouto Dev",
        number: "11111111",
      },

      address: {
        line1: "Dev Office",
        county: "N/A",
        city: "N/A",
        postcode: "1111",
      },

      subscription: {
        plan: "pro",
        billingCycle: "annually",
      },
    };

    await UserModel.create(developerData);

    console.log("✅ Developer Seeded Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Error:", error.message);
    process.exit(1);
  }
};

seedDeveloper();