const Product = require("./../models/productModel");
const catchAsync = require("./../utils/errorHandling");
const {
  createOne,
  getAll,
  updateOne,
  deleteOne,
  getOne,
} = require("./handlerFactory");

exports.createProduct = createOne(Product);
exports.getProduct = getOne(Product);
exports.updateProduct = updateOne(Product);
exports.getAllProducts = getAll(Product);
exports.deleteProduct = deleteOne(Product);
