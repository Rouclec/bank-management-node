const express = require("express");
const {
  createAccount,
  getAccount,
  userDeactivateAccount,
  fetchAccount,
  save,
  withdraw,
  transfer,
  deactivateAccount,
} = require("../controllers/accountController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.route("/").post(createAccount);

router.use(protect);
router.route("/:id").get(fetchAccount, getAccount).patch(userDeactivateAccount);

router.post("/:id/save", fetchAccount, save);
router.post("/:id/withdraw", fetchAccount, withdraw);
router.post("/:id/transfer", fetchAccount, transfer);
router.patch("/:id/user-deactivate", fetchAccount, userDeactivateAccount);
router.patch("/:id/admin-deactivate", fetchAccount, deactivateAccount);

module.exports = router;
