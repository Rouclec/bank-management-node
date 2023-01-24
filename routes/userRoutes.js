const express = require("express");
const {
  login,
  protect,
  forgotPassword,
  updatePasswword,
  resetPassword,
  createUser,
} = require("../controllers/authController");
const {
  updateMe,
  getMe,
  getUser,
  addAccount,
  uploadFile,
  resizePhoto,
} = require("../controllers/userController");

const router = express.Router();

router.post("/signup", createUser);
router.post("/login", login);

router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);

router.use(protect);
router.patch("/updatePassword", updatePasswword);
router.route("/getMe").get(getMe, getUser);
router.route("/updateMe").post(uploadFile, resizePhoto, updateMe);
router.route("/addAccount").post(addAccount);

module.exports = router;
