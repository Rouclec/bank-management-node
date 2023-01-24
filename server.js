const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const app = require("./app");

const DB = process.env.DATABASE.replace("<password>", process.env.DB_PASSWORD);
mongoose
  .set("strictQuery", true)
  .connect(DB)
  .then(() => {
    console.log("Connection Successful!");
  });

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("App running on port: ", port);
});

// process.on("SIGTERM", () => {
//   console.log("SIGTERM RECEIVED. Shutting down gracefully!");
//   server.close(() => {
//     console.log("Process terminated");
//   });
// });
