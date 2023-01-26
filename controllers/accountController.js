const Account = require("../models/accountModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/errorHandling");
const slugify = require("slugify");
const moment = require("moment");
const { getOne, getAll } = require("./handlerFactory");
const Transaction = require("../models/transactionModel");

exports.createAccount = catchAsync(async (req, res, next) => {
  const { expiration, product } = req.body;
  const user = req.user;

  const productId = await Product.findOne({
    slug: slugify(product, { lower: true }),
  });

  const account = await Account.create({
    user,
    product: productId._id,
    expiration: moment(Date.now()).add(expiration * 1, "M"),
  });

  res.status(201).json({
    message: "Created",
    account,
  });
});

exports.userDeactivateAccount = catchAsync(async (req, res, next) => {
  const account = await Account.findById(req.account._id);

  if (!account.isUsersAccount(res.user)) {
    return res.status(403).json({
      status: "Forbidden",
      message: "You don't have access to perform this action!",
    });
  }
  await Account.findByIdAndUpdate(req.account._id, {
    status: "deactivated",
    lastModifiedBy: req.user,
    lastMofiedAt: Date.now(),
  });

  next(
    res.status(204).json({
      status: "Deleted",
      data: null,
    })
  );
});

exports.deactivateAccount = catchAsync(async (req, res, next) => {
  const account = await Account.findById(req.account._id);

  await Account.findByIdAndUpdate(req.account._id, {
    status: "deactivated",
    lastModifiedBy: req.user,
    lastMofiedAt: Date.now(),
  });

  next(
    res.status(204).json({
      status: "Deleted",
      data: null,
    })
  );
});

exports.fetchAccount = catchAsync(async (req, res, next) => {
  const account = await Account.findOne({
    accountNumber: req.params.id,
  });
  if (!account) {
    return res.status(404).json({
      status: "Not Found",
      message: "Account not found!",
    });
  }
  if (!(account.isUsersAccount(res.user) || res.user.role === "admin")) {
    return res.status(403).json({
      status: "Forbidden",
      message: "You don't have access to perform this action!",
    });
  }

  req.account = account;
  next();
});

exports.getAccount = catchAsync(async (req, res, next) => {
  if (!req.account) {
    return next(
      res.status(404).json({
        message: "Not Found",
        message: "Account not Found!",
      })
    );
  }
  return next(
    res.status(200).json({
      message: "OK",
      data: req.account,
    })
  );
});

exports.save = catchAsync(async (req, res, next) => {
  const account = req.account;

  console.log(
    "new balance: ",
    account.balance + req.body.amount,
    " maximum amount",
    account.product
  );

  if (account.balance + req.body.amount > account.product.maximumAmount) {
    return res.status(400).json({
      status: "Bad Request!",
      message: `Transaction failed because account balance cannot exceed ${account.product.maximumAmount}`,
    });
  }
  const newTransaction = await Transaction.create({
    type: "saving",
    sendersAccount: account._id,
    amount: req.body.amount,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id,
    status: "Pending",
  });

  return next(
    res.status(200).json({
      status: "OK",
      data: newTransaction,
    })
  );
});

exports.withdraw = catchAsync(async (req, res, next) => {
  const account = req.account;

  if (account.balance - req.body.amount < 0) {
    return res.status(400).json({
      status: "Bad Request",
      message: "Insufficient funds!",
    });
  }

  const newTransaction = await Transaction.create({
    type: "withdrawal",
    sendersAccount: account._id,
    amount: req.body.amount,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id,
    status: "Pending",
  });

  return next(
    res.status(200).json({
      status: "OK",
      data: newTransaction,
    })
  );
});

exports.transfer = catchAsync(async (req, res, next) => {
  const account = req.account;

  if (account.balance - amount < 0) {
    return res.status(400).json({
      status: "Bad Request",
      message: "Insufficient funds!",
    });
  }

  const receiversAccount = await Account.findOne({
    accountNumber: req.body.receiversAccountNumber,
  });

  const newTransaction = await Transaction.create({
    type: "transfer",
    sendersAccount: account._id,
    receiversAccount: receiversAccount._id,
    amount: req.body.amount,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id,
    status: "Pending",
  });

  return next(
    res.status(200).json({
      status: "OK",
      data: newTransaction,
    })
  );
});

exports.confirmTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOne({ id: req.params.id });
  if (!transaction) {
    return res.status(404).json({
      status: "Not found",
      message: `No pending transaction with id ${req.params.id} found!`,
    });
  }
  if (transaction.status === "Failed") {
    return res.status(404).json({
      status: "Not found",
      message: `No pending transaction with id ${req.params.id} found!`,
    });
  }
  if (transaction.status === "Completed") {
    return res.status(404).json({
      status: "Not found",
      message: `No pending transaction with id ${req.params.id} found!`,
    });
  }

  const { type, sendersAccount, receiversAccount, amount } = transaction;

  if (type === "saving") {
    if (
      sendersAccount.balance + amount >
      sendersAccount.product.maximumAmount
    ) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: "Failed",
      });
      return res.status(400).json({
        status: "Bad Request!",
        message: `Transaction failed because account balance cannot exceed ${sendersAccount.product.maximumAmount}`,
      });
    }
    await Account.findByIdAndUpdate(sendersAccount._id, {
      balance: sendersAccount.balance + amount,
    });
  } else if (type === "withdrawal") {
    if (sendersAccount.balance - amount < 0) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: "Failed",
      });
      return res.status(400).json({
        status: "Bad Request",
        message: "Insufficient funds!",
      });
    }
    await Account.findByIdAndUpdate(sendersAccount._id, {
      balance: sendersAccount.balance - amount,
    });
  } else {
    await Transaction.findByIdAndUpdate(transaction._id, {
      status: "Failed",
    });
    if (sendersAccount.balance - amount < 0) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Insufficient funds!",
      });
    }

    if (
      receiversAccount.balance + amount >
      receiversAccount.product.maximumAmount
    ) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: "Failed",
      });
      return res.status(400).json({
        status: "Bad Request!",
        message: `Transaction failed because account balance cannot exceed ${sendersAccount.product.maximumAmount}`,
      });
    }

    await Account.findByIdAndUpdate(sendersAccount._id, {
      balance: sendersAccount.balance - amount,
    });
    await Account.findByIdAndUpdate(receiversAccount._id, {
      balance: sendersAccount.balance + amount,
    });
  }

  const newTransaction = await Transaction.findByIdAndUpdate(transaction._id, {
    status: "Completed",
  });

  return next(
    res.status(200).json({
      status: "Confirmed",
      data: newTransaction,
    })
  );
});

exports.getAllTransaction = getAll(Transaction);
