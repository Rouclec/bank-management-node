const User = require("../models/userModel");
const catchAsync = require("../utils/errorHandling");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");
const axios = require("axios");
const Email = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRATION * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined; //to remove password field from the query

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    phoneNumber: req.body.phoneNumber,
    passwordConfirm: req.body.passwordConfirm,
    photo: req.body.photo || null,
    role: req.body.role,
    url: `${req.protocol}://${req.get("host")}/api/v1/accounts`,
  });

  const user = await User.findById(newUser._id).populate({
    path: "accounts",
    select: "-product -user -__v",
  });

  //   await new Email(newUser, url).sendWelcome();
  createSendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if request contains email and password

  if (!(email && password)) {
    return next(
      res.status(400).json({
        status: "Bad request",
        message: "Please provide email and password",
      })
    );
  }

  // 2) check if user with said email exists && password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!(user && (await user.correctPassword(password, user.password)))) {
    return next(
      res.status(401).json({
        status: "Unauthorized",
        message: "Incorrect email and password combination",
      })
    );
  }
  //  3) If okay, send token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies) {
    console.log("req cookies: ", req.cookies);
    token = req.cookies.jwt;
  } else {
    return res.status(401).json({
      status: "Unauthorized",
      message: "Please login to access this route",
    });
  }

  // 2) Verify token
  const verifiedToken = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // 3) Check if user still exists
  const user = await User.findById(verifiedToken.id);
  if (!user) {
    return res.status(401).json({
      status: "Unauthorized",
      message: "Somthing went wrong",
    });
  }

  // 4) Check if user changed password after the token was issued
  if (user.changedPassword(verifiedToken.iat)) {
    return next(
      res.status(401).json({
        status: "Unauthorized",
        message: "Somthing went wrong",
      })
    );
  }

  console.log("protect user: ", user);
  //Move to the next middleWare, hance granting access to route
  req.user = user;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log("request user: ", req.user);
    if (!roles.includes(req.user.role)) {
      return next(
        res.status(403).json({
          status: "Forbidden",
          message: "You do not have permission to perform this action",
        })
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user by email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      res.status(404).json({
        status: "Not Found!",
        message: "No such user exists",
      })
    );
  }

  //2) generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) send token to user's email
  try {
    const resetURL = `https://bank-management-node.onrender.com/api/v1/users/resetPassword/${resetToken}`;

    console.log("reset URL: ", resetURL);

    const email = await new Email(user, resetURL).sendPasswordReset();
  } catch (error) {
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save({ validateBeforeSave: false });
    console.log("error: ", error);
    return next(
      res.status(500).json({
        status: "Server error!",
        message: "Error sending email",
      })
    );
  }

  res.status(200).json({
    status: "Sent",
    message: `Follow the link sent to ${req.body.email} within 10 minutes to reset your password`,
  });
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetToken: hashedToken,
    resetTokenExpiration: { $gt: Date.now() },
  }).select("+password");

  // 2) If token has not expired, and user exists, set the new password
  if (!user) {
    return next(
      res.status(500).json({
        status: "Something went Wrong!",
        message: "Invalid Token",
      })
    );
  }

  if (await user.correctPassword(req.body.password, user.password)) {
    return next(
      res.status(500).json({
        status: "Error!",
        message: "Current password and new password cannot be thesame",
      })
    );
  }
  // 3) update the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.resetToken = undefined;
  user.resetTokenExpiration = undefined;

  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
  next();
});

exports.updatePasswword = catchAsync(async (req, res, next) => {
  // 1) Get user from the collection
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;

  if (!(currentPassword && newPassword && newPasswordConfirm)) {
    return next(
      res.status(400).json({
        status: "Bad request",
        message: "Invalid current password or new password",
      })
    );
  }

  const user = await User.findById(req.user.id).select("+password");
  // 2) Check if current password is correct
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(
      res.status(401).json({
        status: "Unauthorized",
        message: "Current password is incorrect",
      })
    );
  }

  if (await user.correctPassword(newPassword, user.password)) {
    return next(
      res.status(500).json({
        status: "Error!",
        message: "Current password and new password cannot be thesame",
      })
    );
  }
  // 3) update the password
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;

  await user.save();

  // 4) Log user in
  createSendToken(user, 200, res);
});
