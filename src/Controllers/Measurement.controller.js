import { Measurements } from "../models/Measurements.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import mongoose from "mongoose";
import { Users } from "../models/Users.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Orders } from "../models/Orders.js";



export const createMeasurement = asynchandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.id;
    const { serviceProviderId, orderId, ...measurements } = req.body;

    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!serviceProviderId || !orderId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "serviceProviderId and orderId are required" });
    }

    // ✅ check provider
    const providerExists = await ServiceProviders.findById(serviceProviderId).session(session);
    if (!providerExists) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Service Provider not found" });
    }

    // ✅ format measurements
    const formattedMeasurements = Object.fromEntries(
      Object.entries(measurements).map(([key, value]) => [
        key,
        value === undefined || value === "" ? null : value,
      ])
    );

    // ✅ find user inside transaction
    const user = await Users.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingIndex = user.measurements.findIndex(
      (m) => m.serviceProviderId.toString() === serviceProviderId
    );

    if (existingIndex === -1) {
      user.measurements.push({ serviceProviderId, ...formattedMeasurements });
    } else {
      user.measurements[existingIndex] = {
        ...user.measurements[existingIndex]._doc,
        serviceProviderId,
        ...formattedMeasurements,
      };
    }

    await user.save({ session });

    // ✅ update order inside same transaction
    const updatedOrder = await Orders.findByIdAndUpdate(
      orderId,
      { measurementAdded: true },
      { new: true, session }
    );

    if (!updatedOrder) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

  
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message:
        existingIndex === -1
          ? "Measurement added successfully & order updated"
          : "Measurement updated successfully & order updated",
    });
  } catch (error) {
("Error in addMeasurement:", error);
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving measurements",
    });
  } finally {
    session.endSession();
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


export const getMeasurementsWithProvider = asynchandler(async (req, res) => {
  try {
    const userId = req.id; // Assuming this comes from authentication middleware
    
    // Find user with measurements and populate service provider details
    const user = await Users.findById(userId)
      .populate({
        path: 'measurements.serviceProviderId',
        select: 'username email phoneNo shopAddress' // Select the fields you need
      });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Format the response data to match frontend expectations
    const measurementsWithProviders = user.measurements.map(measurement => ({
      _id: measurement._id,
      serviceProvider: {
        _id: measurement.serviceProviderId._id,
        username: measurement.serviceProviderId.username,
        email: measurement.serviceProviderId.email,
        phone: measurement.serviceProviderId.phoneNo || 'Not provided',
        address: measurement.serviceProviderId.shopAddress || 'Not provided'
      },
      measurements: {
        chest: measurement.chest,
        waist: measurement.waist,
        hips: measurement.hips,
        shoulder: measurement.shoulder,
        sleeveLength: measurement.sleeveLength,
        shirtLength: measurement.shirtLength,
        trouserLength: measurement.trouserLength,
        inseam: measurement.inseam,
        neck: measurement.neck,
        notes: measurement.notes
      },
      createdAt: measurement.createdAt,
      updatedAt: measurement.updatedAt
    }));    
    res.status(200).json({
      success: true,
      data: measurementsWithProviders
    });
  } catch (error) {
('Error fetching measurements:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching measurements' 
    });
  }
});
