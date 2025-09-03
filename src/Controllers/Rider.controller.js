import { Riders } from "../models/Rider.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";

export const createRider = asynchandler(async (req, res) => {
  const { name, CNIC, phoneNo, profilePic } = req.body;
  const id = req.user._id;  

  const provider = await ServiceProviders.findOne({ user: id });

  if (!provider) {
    throw new Apierror(404, "Service provider not found");
  }
  if (!name || !CNIC || !phoneNo ) {
    throw new Apierror(400, "All fields except profilePic are required");
  }

  const existingRider = await Riders.findOne({ $or: [{ CNIC }, { name }] });
  if (existingRider) {
    throw new Apierror(400, "Rider with the same CNIC or name already exists");
  }

  const newRider = await Riders.create({ name, CNIC, phoneNo, profilePic,serviceProvider:provider._id});

  res.status(201).json(new Apiresponse(201, newRider, "Rider created successfully"));
});

export const getAllRiders = asynchandler(async (req, res) => {
  const riders = await Riders.find().populate("serviceProvider", "username email");
  res.status(200).json(new Apiresponse(200, riders, "Riders fetched successfully"));
});

export const getRiderById = asynchandler(async (req, res) => {
  const { id } = req.params;
  const rider = await Riders.findById(id).populate("serviceProvider", "username email");

  if (!rider) {
    throw new Apierror(404, "Rider not found");
  }

  res.status(200).json(new Apiresponse(200, rider, "Rider fetched successfully"));
});

export const getRiderByProvider = asynchandler(async (req, res) => {
  const id = req.user._id;  

  const provider = await ServiceProviders.findOne({ user: id });

  if (!provider) {
    throw new Apierror(404, "Service provider not found");
  }

  const riders = await Riders.find({ serviceProvider: provider._id }).populate(
    "serviceProvider",
    "username email"
  );

  res.status(200).json(new Apiresponse(200, riders, "Riders fetched successfully"));
});


export const updateRider = asynchandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const rider = await Riders.findById(id);
  if (!rider) {
    throw new Apierror(404, "Rider not found");
  }

  Object.assign(rider, updates);
  await rider.save();

  res.status(200).json(new Apiresponse(200, rider, "Rider updated successfully"));
});

export const deleteRider = asynchandler(async (req, res) => {
  const { id } = req.params;

  const rider = await Riders.findById(id);
  if (!rider) {
    throw new Apierror(404, "Rider not found");
  }

  await rider.deleteOne();

  res.status(200).json(new Apiresponse(200, null, "Rider deleted successfully"));
});
