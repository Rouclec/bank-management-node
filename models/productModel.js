const mongoose = require("mongoose");
const slugify = require("slugify");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  slug: String,
  description: String,
  maximumAmount: Number,
  // createdBy: {
  //   type: mongoose.Schema.ObjectId,
  //   ref: "User",
  // },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// productSchema.pre(/^find/, function (next) {
//   this.populate({ path: "createdBy" });
//   next();
// });

productSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
