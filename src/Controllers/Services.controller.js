import { Services } from "../models/Services.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";

export const createService = asynchandler(async (req, res) => {
  const { name } = req.body;

  if (!name ) {
    throw new Apierror(400, "All fields are required");
  }

  const service = await Services.create({ name });
  res.status(201).json(new Apiresponse(201, service, "Service created successfully"));
});

export const getAllServices = asynchandler(async (req, res) => {
  const services = await Services.find();
  res.status(200).json(new Apiresponse(200, services, "Services fetched successfully"));
});

export const getServiceById = asynchandler(async (req, res) => {
  const service = await Services.findById(req.params.id);

  if (!service) {
    throw new Apierror(404, "Service not found");
  }

  res.status(200).json(new Apiresponse(200, service, "Service fetched successfully"));
});

export const updateService = asynchandler(async (req, res) => {
  const service = await Services.findByIdAndUpdate(req.params.id, req.body, { new: true });

  if (!service) {
    throw new Apierror(404, "Service not found");
  }

  res.status(200).json(new Apiresponse(200, service, "Service updated successfully"));
});

export const deleteService = asynchandler(async (req, res) => {
  const service = await Services.findByIdAndDelete(req.params.id);

  if (!service) {
    throw new Apierror(404, "Service not found");
  }

  res.status(200).json(new Apiresponse(200, null, "Service deleted successfully"));
});
