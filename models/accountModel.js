const mongoose = require("mongoose");
const validator = require("validator");
const { uuid } = require("uuidv4");

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    default: uuid().replace("-", "").slice(0, 12),
  },
  balance: {
    type: Number,
    default: 0.0,
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
  },
  expiration: {
    type: Date,
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "suspended", "deactivated"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdOn: {
    type: Date,
    default: Date.now(),
  },
  lastModifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  lastModifiedOn: {
    type: Date,
    default: Date.now(),
  },
});

accountSchema.pre(/^find/, async function (next) {
  this.find({ status: "active" });
  next();
});

accountSchema.methods.isUsersAccount = async function (user) {
  return this.user === user;
};

accountSchema.pre(/^find/, function (next) {
  this.populate({ path: "product" });
  this.populate({ path: "user" });
  next();
});

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;
