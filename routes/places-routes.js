const express = require("express");
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require('../middleware/check-auth');

// importing controllers/functions
const placesControllers = require("../controllers/places-controllers");

// configured router to then export over to app.js
const router = express.Router();

// get a specific place by placeId
router.get("/:pid", placesControllers.getPlaceById);

//retrieve list of places for a given user by user id
router.get("/user/:uid", placesControllers.getPlacesByUserId);
 

// filtering routes below vvvv AUTHORIZATION
router.use(checkAuth);

// adding a new place vvvv Needs validation
router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
);

// update place vvvv Needs validation
router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesControllers.updatePlace
);

// delete place
router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
