import {Measurements} from "../models/Measurements.model.js"; 
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import mongoose from "mongoose";
import { Users } from "../models/Users.model.js";

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
  const userId = new mongoose.Types.ObjectId(req.id);

  try {
    const measurements = await Users.aggregate([
      { $match: { _id: userId } },
      { $unwind: "$measurements" }, // split measurements array
      {
        $lookup: {
          from: "serviceproviders", // collection name in MongoDB
          localField: "measurements.serviceProviderId",
          foreignField: "_id",
          as: "serviceProvider",
        },
      },
      { $unwind: "$serviceProvider" }, // flatten serviceProvider array
      {
        $project: {
          _id: 0,
          chest: "$measurements.chest",
          waist: "$measurements.waist",
          hips: "$measurements.hips",
          shoulder: "$measurements.shoulder",
          sleeveLength: "$measurements.sleeveLength",
          shirtLength: "$measurements.shirtLength",
          trouserLength: "$measurements.trouserLength",
          inseam: "$measurements.inseam",
          neck: "$measurements.neck",
          notes: "$measurements.notes",
          serviceProvider: {
            _id: 1,
            username: 1,
            phoneNo: 1,
            shopAddress: 1,
            servicesOffered: 1,
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      measurements,
    });
  } catch (error) {
    console.error("Error fetching measurements:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch measurements",
      error: error.message,
    });
  }
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
