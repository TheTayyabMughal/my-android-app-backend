import { Riders } from "../models/Rider.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";

export const createRider = asynchandler(async (req, res) => {
  const { name, CNIC, phoneNo } = req.body;
  const id = req.id; 
  const provider = await ServiceProviders.findById(id); // Ensure provider exists

  if (!provider) {
    return res.status(404).json({ success: false, message: "Service provider not found" });
  }

  if (!name || !CNIC || !phoneNo) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // Check if rider already exists
  const existingRider = await Riders.findOne({ $or: [{ CNIC }, { name }] });
  if (existingRider) {
    return res.status(400).json({ success: false, message: "Rider with same CNIC or Name already exists" });
  }

  const newRider = await Riders.create({
    name,
    CNIC,
    phoneNo,
    serviceProvider: provider._id
  });
  res.status(201).json({ success: true, data: newRider, message: "Rider created successfully" });
});

export const getAllRiders = asynchandler(async (req, res) => {
 try {
    const riders = await Riders.find().populate('serviceProvider');
    res.json(riders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export const getRiderById = asynchandler(async (req, res) => {
  const id = req.id;
  const rider = await Riders.findById(id)
  if (!rider) {
    throw new Apierror(404, "Rider not found");
  }
  res.status(200).json(new Apiresponse(200, rider, "Rider fetched successfully"));
});

export const getRiderByProvider = asynchandler(async (req, res) => {
  const id = req.id;  

  const riders = await Riders.find({ serviceProvider: id }).populate(
    "serviceProvider",
    "username email"
  );

  res.status(200).json(new Apiresponse(200, riders, "Riders fetched successfully"));
});


export const updateRider = asynchandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const rider = await Riders.findById(id);
  if (!rider) {
    throw new Apierror(404, "Rider not found");
  }

  Object.assign(rider, data);
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
