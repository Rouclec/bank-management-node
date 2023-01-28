const express = require("express");


const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");


const userRouter = require("./routes/userRoutes");
const productRouter = require("./routes/productRoutes");
const accountRouter = require("./routes/accountRoutes");
const transactionRouter = require("./routes/transactionsRoutes");

const app = express();

// app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());

//for security
app.use(express.json({ limit: "10kb" }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/accounts", accountRouter);
app.use("/api/v1/transactions", transactionRouter);
module.exports = app;
