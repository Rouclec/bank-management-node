const Account = require("../models/accountModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/errorHandling");
const slugify = require("slugify");
const moment = require("moment");
const { getOne, getAll } = require("./handlerFactory");
const Transaction = require("../models/transactionModel");

//middleware to create a new account
exports.createAccount = catchAsync(async (req, res, next) => {
  const { expiration, product } = req.body; //get the product name and the expiration (in months) from the request body
  const user = req.user; //since you must be logged in, the user will be in the request
  //find the product with the said product name
  const productId = await Product.findOne({
    slug: slugify(product, { lower: true }),
  });
  //create the account with the user, product and expiration
  const account = await Account.create({
    user,
    product: productId._id,
    expiration: moment(Date.now()).add(expiration * 1, "M"), //add the months to today's date
  });
  //send the account as a response to the user
  res.status(201).json({
    message: "Created",
    account,
  });
});

//method for a user to disactivate his account
exports.userDeactivateAccount = catchAsync(async (req, res, next) => {
  const account = await Account.findById(req.account._id); //find the account by the id passed in the request
  //if the account doesn't belong to the user, throw an error
  if (!account.isUsersAccount(res.user)) {
    return res.status(403).json({
      status: "Forbidden",
      message: "You don't have access to perform this action!",
    });
  }
  //else, disactive the account by setting the status to deactivated
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

//method for admin to disactivate an account
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

//middleware to fetch an account
exports.fetchAccount = catchAsync(async (req, res, next) => {
  //find the account by the id passed in the request parameter
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

//method to get an account
exports.getAccount = catchAsync(async (req, res, next) => {
  //check if the request has an account
  if (!req.account) {
    return next(
      res.status(404).json({
        message: "Not Found",
        message: "Account not Found!",
      })
    );
  }
  //return the account as on the request
  return next(
    res.status(200).json({
      message: "OK",
      data: req.account,
    })
  );
});

//method to save
exports.save = catchAsync(async (req, res, next) => {
  const account = req.account; //get the account from the request
  //check if the amount to be saved is greater than the maximum amount for that account
  if (account.balance + req.body.amount > account.product.maximumAmount) {
    return res.status(400).json({
      status: "Bad Request!",
      message: `Transaction failed because account balance cannot exceed ${account.product.maximumAmount}`,
    });
  }
  //create a new transaction
  const newTransaction = await Transaction.create({
    type: "saving",
    sendersAccount: account._id,
    amount: req.body.amount,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id,
    status: "Pending",
  });
  //return the new transaction as the response
  return next(
    res.status(200).json({
      status: "OK",
      data: newTransaction,
    })
  );
});

//method to withdraw
exports.withdraw = catchAsync(async (req, res, next) => {
  const account = req.account; //get the account from the request
  //check if the amount to be withdrawn is less than or equal to the balance
  if (account.balance - req.body.amount < 0) {
    return res.status(400).json({
      status: "Bad Request",
      message: "Insufficient funds!",
    });
  }
  //create a new transaction
  const newTransaction = await Transaction.create({
    type: "withdrawal",
    sendersAccount: account._id,
    amount: req.body.amount,
    createdBy: req.user._id,
    lastModifiedBy: req.user._id,
    status: "Pending",
  });

  return next(
    //return the response
    res.status(200).json({
      status: "OK",
      data: newTransaction,
    })
  );
});

//method to transfer
exports.transfer = catchAsync(async (req, res, next) => {
  const account = req.account; //get the account frm the request

  const { amount } = req.body; //get the amount from the request body
  //if the amount is greater then the sender's account balance, throw an error
  if (account.balance < amount) {
    return res.status(400).json({
      status: "Bad Request",
      message: "Insufficient funds!",
    });
  }
  //get the receiver's account from the account number passed in the request body
  const receiversAccount = await Account.findOne({
    accountNumber: req.body.receiversAccountNumber,
  });
  //if the receiver's account is not found, throw an error
  if (!receiversAccount) {
    return res.status(404).json({
      status: "Not found",
      message: `Account with number ${req.body.receiversAccountNumber} not found`,
    });
  }

  //else create a new transaction
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

//method to confirm a transcation
exports.confirmTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOne({ id: req.params.id }); //get the transaction by the id passed in the request parameter
  //if the transaction is not found, throw an error
  if (!transaction) {
    return res.status(404).json({
      status: "Not found",
      message: `No pending transaction with id ${req.params.id} found!`,
    });
  }

  //check if the transaction has failed or completed
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

  //get the type, sender's account, receiver's account and amount from the transaction
  const { type, sendersAccount, receiversAccount, amount } = transaction;

  //check the type of the traction and perform the following actions
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
