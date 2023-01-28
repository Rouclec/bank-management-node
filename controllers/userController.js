const axios = require("axios");
const User = require("../models/userModel");
const catchAsync = require("./../utils/errorHandling");
const {
  createOne,
  getAll,
  updateOne,
  deleteOne,
  getOne,
} = require("./handlerFactory");

const multer = require("multer");
const sharp = require("sharp");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cbFxn) => {
  if (file.mimetype.startsWith("image")) {
    cbFxn(null, true);
  } else {
    cbFxn("Error: Not an image! Please upload only images", false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadFile = upload.single("photo");

exports.resizePhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500) //reizes the image to 500x500
    .toFormat("jpeg") //converts the image to a jpeg format
    .jpeg({ quality: 90 }) //sets the quality to 90% of the original quality
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

exports.getUser = getOne(User, "accounts");

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.addAccount = catchAsync(async (req, res, next) => {
  const user = req.user;

  const { product, expiration } = req.body;
  const accountRes = await axios.post(
    `${req.protocol}://${req.get("host")}/api/v1/accounts`,
    {
      user: user._id,
      product: product,
      expiration: expiration * 1,
    }
  );
  user.accounts.push(accountRes.data.account._id);

  await User.findByIdAndUpdate(user._id, {
    accounts: user.accounts,
  });

  res.status(201).json({
    message: "Created",
    account: accountRes.data.account,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.file) req.body.photo = req.file.filename;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      email: req.body.email,
      username: req.body.username,
      photo: req.body.photo,
    },
    { new: true, runValidators: true }
  );

  next(
    res.status(200).json({
      status: "Updated",
      data: user,
    })
  );
});
