import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Users } from "../models/Users.model.js";
import { Riders } from "../models/Rider.model.js";
import { Feedback } from "../models/Feedback.model.js"
import { Offers } from "../models/Offers.model.js"
import { ServiceProviders } from "../models/ServiceProviders.model.js";


// used component 
export const getProviderProfile = asynchandler(async (req, res) => {
  try {
    // Check if user ID exists
    if (!req.id) {
      return res.status(400).json({
        success: false,
        message: "User ID not provided"
      });
    }

    const userId = req.id;

    const provider = await ServiceProviders.findById(userId)
      .select("username phoneNo email shopAddress servicesOffered")
      .populate({
        path: 'servicesOffered',
        select: 'name',
        model: 'Services'
      });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found"
      });
    }

    res.status(200).json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error("Error fetching provider profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


// #################################################################################


export const getAllServiceProviders = asynchandler(async (req, res) => {
  const serviceProviders = await ServiceProviders.find().populate("user servicesOffered");

  res.status(200).json(new Apiresponse(200, serviceProviders, "Service providers fetched successfully"));
});


export const getNearestServiceProviders = asynchandler(async (req, res) => {
  const { longitude, latitude, maxDistance = 10000, serviceId } = req.query;

  if (!longitude || !latitude) {
    throw new Apierror(400, "longitude and latitude are required");
  }

  const lng = parseFloat(longitude);
  const lat = parseFloat(latitude);
  const distance = parseFloat(maxDistance);

  let query = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: distance
      }
    }
  };

  if (serviceId) {
    query.servicesOffered = serviceId;
  }

  const serviceProviders = await ServiceProviders.find(query)
    .populate("user servicesOffered");


  res.status(200).json(
    new Apiresponse(200, serviceProviders, "Nearby service providers fetched successfully")
  );
});

export const getServiceProviderById = asynchandler(async (req, res) => {
  const serviceProvider = await ServiceProviders.findById(req.params.id).populate("user servicesOffered");

  if (!serviceProvider) {
    throw new Apierror(404, "Service provider not found");
  }

  res.status(200).json(new Apiresponse(200, serviceProvider, "Service provider fetched successfully"));
});


export const getServiceProviderHistoryById = asynchandler(async (req, res) => {
  const serviceProvider = await ServiceProviders.findById(req.params.id).populate("user servicesOffered");


  const feedbacks = await Feedback.find({ serviceProvider: req.params.id })

  const offers = await Offers.find({ serviceProvider: req.params.id })

  if (!serviceProvider) {
    throw new Apierror(404, "Service provider not found");
  }

  res.status(200).json(new Apiresponse(200, { serviceProvider, feedbacks, offers }, "Service provider fetched successfully"));
});



export const getServiceProvidersByService = asynchandler(async (req, res) => {
  const { serviceId } = req.params;

  const serviceProviders = await ServiceProviders.find({
    servicesOffered: serviceId,
  }).populate("user servicesOffered");

  if (!serviceProviders || serviceProviders.length === 0) {
    throw new Apierror(404, "No service providers found for this service");
  }

  res.status(200).json(
    new Apiresponse(200, serviceProviders, "Service providers fetched successfully")
  );
});


export const updateServiceProvider = asynchandler(async (req, res) => {
  const { username, email, profilePic, shopAddress, phoneNo, servicesOffered } = req.body;

  const serviceProvider = await ServiceProviders.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        username,
        email,
        profilePic,
        shopAddress,
        phoneNo,
        servicesOffered,
      },
    },
    { new: true }
  ).populate("user servicesOffered");

  if (!serviceProvider) {
    throw new Apierror(404, "Service provider not found");
  }

  res.status(200).json(new Apiresponse(200, serviceProvider, "Service provider updated successfully"));
});


export const deleteServiceProvider = asynchandler(async (req, res) => {
  const serviceProvider = await ServiceProviders.findById(req.params.id);

  if (!serviceProvider) {
    throw new Apierror(404, "Service provider not found");
  }

  await Riders.deleteMany({ serviceProvider: serviceProvider._id });

  if (serviceProvider.user) {
    await Users.findByIdAndDelete(serviceProvider.user);
  }

  await serviceProvider.deleteOne();

  res.status(200).json(new Apiresponse(200, {}, "Service provider deleted successfully"));
});


