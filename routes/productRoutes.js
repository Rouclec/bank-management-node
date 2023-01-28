const express = require("express");
const { restrictTo, protect } = require("../controllers/authController");
const {
  getAllProducts,
  createProduct,
  deleteProduct,
  updateProduct,
  getProduct,
} = require("../controllers/productController");

const router = express.Router();

router.use(protect);
router.route("/").get(getAllProducts).post(restrictTo("admin"), createProduct);
router.route("/:id").get(getProduct).delete(deleteProduct).patch(updateProduct);

module.exports = router;
