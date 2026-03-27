const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "client", "superadmin"],
      default: "client",
    },
    title: {
      type: String,
      required: true,
      enum: ["Mr", "Mrs", "Ms", "Miss", "Dr", "Other"],
    },
    firstname: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    company: {
      name: {
        type: String,
        required: true,
      },
      number: {
        type: String,
        required: true,
      },
    },

    address: {
      line1: {
        type: String,
        required: true,
      },
      county: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      postcode: {
        type: String,
        required: true,
      },
    },

    // Subscription Info
    subscription: {
      plan: {
        type: String,
        enum: ["starter", "pro"],
      },

      billingCycle: {
        type: String,
        enum: ["monthly", "annually"],
      },

      status: {
        type: String,
        enum: ["inactive", "pending", "active", "canceled"],
        default: "inactive",
      },

      stripeCustomerId: {
        type: String,
      },

      stripeSubscriptionId: {
        type: String,
      },

      stripePriceId: {
        type: String,
      },

      currentPeriodEnd: {
        type: Date,
      },
    },

    activePlans: [
      {
        plan: {
          type: String,
          enum: ["starter", "pro"],
          required: true,
        },
        sitesLimit: {
          type: Number,
          required: true,
        },
        expiresAt: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
