const mongoose = require("mongoose");
const { uuid } = require("uuidv4");

const transactionSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuid().replace("-", "").slice(0, 7),
  },
  type: {
    type: String,
    enum: ["saving", "withdrawal", "transfer"],
  },
  sendersAccount: {
    type: mongoose.Schema.ObjectId,
    ref: "Account",
  },
  receiversAccount: {
    type: mongoose.Schema.ObjectId,
    ref: "Account",
  },
  amount: Number,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  lastModifiedOn: {
    type: Date,
    default: Date.now(),
  },
  lastModifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["Pending", "Completed", "Failed"],
    default: "Pending",
  },
});

transactionSchema.pre(/^find/, function (next) {
  this.populate({ path: "sendersAccount" });
  this.populate({ path: "receiversAccount" });
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
