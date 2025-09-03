import {Measurements} from "../models/Measurements.model.js"; 
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";

export const createMeasurement = asynchandler(async (req, res) => {
  const {
    shirtLength,
    shirt,
    waistcoat,
    sleeve,
    shoulderWidth,
    neck,
    chest,
    waist,
    bottomWidth,
    trouserLength,
    hem,
    front,
    collar,
    side,
    cuff,
    additionalDetails
  } = req.body;

  const user = req.user._id;

  const newMeasurement = await Measurements.create({
    shirtLength,
    shirt,
    waistcoat,
    sleeve,
    shoulderWidth,
    neck,
    chest,
    waist,
    bottomWidth,
    trouserLength,
    hem,
    front,
    collar,
    side,
    cuff,
    additionalDetails,
    user
  });

  res
    .status(201)
    .json(new Apiresponse(201, newMeasurement, "Measurement created successfully"));
});

export const getMyMeasurements = asynchandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  const total = await Measurement.countDocuments({ user: req.user._id });
  const measurements = await Measurements.find({ user: req.user._id })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const hasNextPage = page * limit < total;

  res.status(200).json({
    success: true,
    measurements,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    nextPage: hasNextPage ? page + 1 : null
  });
});

export const getMeasurementById = asynchandler(async (req, res) => {
  const measurement = await Measurements.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!measurement) {
    throw new Apierror(404, "Measurement not found");
  }

  res
    .status(200)
    .json(new Apiresponse(200, measurement, "Measurement fetched successfully"));
});

export const updateMeasurement = asynchandler(async (req, res) => {
  const updated = await Measurements.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: req.body },
    { new: true }
  );

  if (!updated) {
    throw new Apierror(404, "Measurement not found or not yours");
  }

  res
    .status(200)
    .json(new Apiresponse(200, updated, "Measurement updated successfully"));
});

export const deleteMeasurement = asynchandler(async (req, res) => {
  const deleted = await Measurements.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!deleted) {
    throw new Apierror(404, "Measurement not found or not yours");
  }

  res
    .status(200)
    .json(new Apiresponse(200, {}, "Measurement deleted successfully"));
});
