const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "client", "superadmin", "developer"],
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

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
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

    // 🔹 Stripe Reference (NOT source of truth anymore)
    subscription: {
      stripeCustomerId: String,
    },

    isPaymentPlanActive: {
      type: Boolean,
      default: false,
    },

    // 🔥 REAL SOURCE OF TRUTH
    entitlements: [
      {
        plan: {
          type: String,
          enum: ["starter", "pro"],
          required: true,
        },

        stripeSubscriptionId: {
          type: String,
          required: true,
        },

        expiresAt: {
          type: Date,
          required: true,
        },
      },
    ],

    addonEntitlements: [
      {
        addonId: {
          type: String,
          required: true,
        },
        stripeSubscriptionId: {
          type: String,
          required: true,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
      },
    ],

    googleTokens: {
      access_token: String,
      refresh_token: String,
      scope: String,
      token_type: String,
      expiry_date: Number,
    },

    acceptTerms: {
      type: Boolean,
      required: true,
    },
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
