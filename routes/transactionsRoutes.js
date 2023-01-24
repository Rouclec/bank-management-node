const express = require("express");
const {
  getAllTransaction,
  confirmTransaction,
} = require("../controllers/accountController");
const { restrictTo, protect } = require("../controllers/authController");

const router = express.Router();

router.route("/").get(getAllTransaction);

router.use(protect);
router.patch(
  "/confirmTransaction/:id",
  restrictTo("admin"),
  confirmTransaction
);

module.exports = router;
