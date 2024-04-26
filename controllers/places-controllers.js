const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const getCoordsForAddress = require("../util/location");

// custom error handling class

const HttpError = require("../models/http-error");

const { application } = require("express");
// import schema from mongoose
const Place = require("../models/place");
// adding relation
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

// getting place by place Id
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Could not find place by provided place Id",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id",
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

// getting places by the user Id
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Could not find place by provided user id",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user id", 404)
    );
  }

  res.json({
    places: userWithPlaces.places.map(place =>
      place.toObject({ getters: true })
    ),
  });
};

//   posting a new place
const createPlace = async (req, res, next) => {
  // checks to see if there were any given data missing or not conditional to what you've set up in the routes file.
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );

  const { title, description, address,  } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;
  try {
    // check if logged in ID of user exists
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      " Creating place failed. Please try again.",
      500
    );
    return next(error);
  }
  if (!user) {
    const error = new HttpError("Could not find user for provided id. ", 404);
    return next(error);
  }

  console.log(user);

  try {
    // two step process
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });

    user.places.push(createdPlace);
    await user.save({ session: sess });
    sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating a place failed, please try again",
      500
    );

    return next(error);
  }

  
  res.status(201).json({ place: createdPlace });
};

// update place
const updatePlace = async (req, res, next) => {
  // checks to see if there were any given data missing or not conditional to what you've set up in the routes file.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong. Could not update place",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
     const error = new HttpError(
      "You are not allowed to edit this place.",
      401
     );
     return next(error);
  };

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong. Could not update place",
      500
    );
    return next(error);
  }



  res.status(200).json({ place: place.toObject({ getters: true }) });
};

// delete place
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  // check to see if a place even exists before deleting
  let place;

  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong. Could not delete place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for Id.", 404);
    return next(error);
  }
    
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place.",
      401
    );
    return next(error);
  };

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    // remove place from collection
    await Place.remove(placeId, { session: sess });
    // access place id in creator
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
   
    const error = new HttpError(
      "Something went wrong. Could not delete place.",
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Deleted place." });
};

// exporting via the node object

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
