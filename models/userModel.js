const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const axios = require("axios");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "User must have a username"],
    },
    email: {
      type: String,
      required: [true, "Please provide a valid email"],
      unique: [true, "This email is already in use by a user in the system"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    photo: {
      type: String,
    },
    phoneNumber: {
      type: String,
      validate: [validator.isMobilePhone],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match!!",
      },
    },
    passwordChangedAt: Date,
    resetToken: String,
    resetTokenExpiration: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "super-admin"],
      default: "user",
    },
    shortees: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    accounts: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Account",
      },
    ],
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    lastModifiedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    lastModifiedAt: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre("save", async function (next) {
  //A pre method runs before the save
  if (!this.isModified("password")) return next(); //Checks if password field has been modified(or created)

  this.password = await bcrypt.hash(this.password, 12); //encrypt the password

  this.passwordConfirm = undefined; //set passwordConfirm to underfined so it is not saved in the DB
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, async function (next) {
  this.find({ active: { $ne: false } });
  next();
});
userSchema.methods.correctPassword = async function (
  password,
  encryptedPassword
) {
  return await bcrypt.compare(password, encryptedPassword);
};

// userSchema.virtual("accounts", {
//   ref: "Account",
//   foreignField: "user",
//   localField: "_id",
// });

userSchema.post("save", async function (doc, next) {
  console.log("url: ", `${req.protocol}://${req.get("host")}/api/v1/accounts`);
  const res = await axios.post(
    `${req.protocol}://${req.get("host")}/api/v1/accounts`,
    {
      user: doc._id,
      product: "current account",
      expiration: 6,
    }
  );
  doc.accounts.push(res.data.account._id);
  await User.findByIdAndUpdate(doc._id, {
    accounts: doc.accounts,
  });
  next();
});

userSchema.methods.changedPassword = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedAt;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetTokenExpiration = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
