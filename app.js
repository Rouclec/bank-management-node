const express = require("express");

const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");

const userRouter = require("./routes/userRoutes");
const productRouter = require("./routes/productRoutes");
const accountRouter = require("./routes/accountRoutes");
const transactionRouter = require("./routes/transactionsRoutes");

const app = express();

// app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());

//use session to enable passing cookies between different domains
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: "session",
    cookie: {
      maxAge: 1000 * 60 * 60,
      sameSite: "none", //set to true if F.E. is on production
      secure: false,
    },
  })
);
app.use(express.json({ limit: "10kb" }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/accounts", accountRouter);
app.use("/api/v1/transactions", transactionRouter);
module.exports = app;
