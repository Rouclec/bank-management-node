const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const app = require("./app");

const DB = process.env.DATABASE.replace("<password>", process.env.DB_PASSWORD);
mongoose
  .set("strictQuery", true)
  .connect(DB)
  .then(() => {
    console.log("successfully connected to: ", DB);
  });

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("App running on port: ", port);
});
