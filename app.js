const fs = require("fs");
const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const mongourl =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mernapp.e3vo1kx.mongodb.net/?retryWrites=true&w=majority&appName=${process.env.DB_NAME}`;
const bodyParser = require("body-parser");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

// related to the post method
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

// placesRoutes middleware
app.use("/api/places", placesRoutes);
// usersRoutes middleware
app.use("/api/users", usersRoutes);

// error middleeware after responses were not called
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  } 
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured." });
  next(error);
});

mongoose
  .connect(mongourl)
  .then(() => {
    console.log("Connected to database! Now attempting to start server..");
    app.listen(5001, () => {
      console.log("App is listening on port 5001");
    });
  })
  .catch((err) => {
    console.log(err);
  });
