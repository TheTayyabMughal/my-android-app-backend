import { Feedback } from "../models/Feedback.model.js";
import { Orders } from "../models/Orders.js";
import { Riders } from "../models/Rider.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import mongoose from "mongoose";

export const createFeedback = asynchandler(async (req, res) => {
  const { rating, comment, orderId, feedbackType = "overall" } = req.body;
  const givenBy = req.user._id;

  if (!rating || !orderId) {
    throw new Apierror(400, "Rating and Order ID are required");
  }

  // Check if order exists and belongs to user
  const order = await Orders.findById(orderId).populate('orders.ServiceProviderId').populate('rider');
  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  if (order.user.toString() !== givenBy.toString()) {
    throw new Apierror(403, "You can only give feedback for your own orders");
  }

  if (order.status !== "Delivered") {
    throw new Apierror(400, "You can only give feedback for delivered orders");
  }

  // Check if feedback already exists for this order
  const existingFeedback = await Feedback.findOne({ givenBy, order: orderId });
  if (existingFeedback) {
    throw new Apierror(400, "Feedback already submitted for this order");
  }

  // Get service provider and rider from order
  const serviceProvider = order.orders[0]?.ServiceProviderId;
  const rider = order.rider;

  const feedback = await Feedback.create({
    rating,
    comment,
    givenBy,
    order: orderId,
    serviceProvider: serviceProvider?._id,
    rider: rider?._id,
    feedbackType,
    isVerified: true
  });

  // Update order with feedback reference
  order.feedback = feedback._id;
  await order.save();

  const populatedFeedback = await Feedback.findById(feedback._id)
    .populate('givenBy', 'username email')
    .populate('order', 'orderNumber')
    .populate('serviceProvider', 'username')
    .populate('rider', 'name');

  res.status(201).json(
    new Apiresponse(201, populatedFeedback, "Feedback submitted successfully")
  );
});

export const getFeedbacksByOrder = asynchandler(async (req, res) => {
  const { orderId } = req.params;

  const feedbacks = await Feedback.find({ order: orderId })
    .populate("givenBy", "username email")
    .populate("serviceProvider", "username")
    .populate("rider", "name")
    .sort({ createdAt: -1 });

  res.status(200).json(
    new Apiresponse(200, feedbacks, "Feedbacks fetched successfully")
  );
});

export const getFeedbacksByRider = asynchandler(async (req, res) => {
  const { riderId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const feedbacks = await Feedback.find({ rider: riderId })
    .populate("givenBy", "username email")
    .populate("order", "orderNumber")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments({ rider: riderId });
  const avgRating = await Feedback.aggregate([
    { $match: { rider: mongoose.Types.ObjectId(riderId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } }
  ]);

  res.status(200).json(
    new Apiresponse(200, {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalFeedbacks: total
      },
      averageRating: avgRating[0]?.avgRating || 0
    }, "Feedbacks fetched successfully")
  );
});

export const getFeedbacksByProvider = asynchandler(async (req, res) => {
  const { providerId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const feedbacks = await Feedback.find({ serviceProvider: providerId })
    .populate("givenBy", "username email")
    .populate("order", "orderNumber")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments({ serviceProvider: providerId });
  const avgRating = await Feedback.aggregate([
    { $match: { serviceProvider: mongoose.Types.ObjectId(providerId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } }
  ]);

  res.status(200).json(
    new Apiresponse(200, {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalFeedbacks: total
      },
      averageRating: avgRating[0]?.avgRating || 0
    }, "Feedbacks fetched successfully")
  );
});

export const getMyFeedbacks = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const feedbacks = await Feedback.find({ givenBy: userId })
    .populate("order", "orderNumber status")
    .populate("serviceProvider", "username")
    .populate("rider", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments({ givenBy: userId });

  res.status(200).json(
    new Apiresponse(200, {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalFeedbacks: total
      }
    }, "My feedbacks fetched successfully")
  );
});

export const updateFeedback = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new Apierror(404, "Feedback not found");
  }

  if (feedback.givenBy.toString() !== userId.toString()) {
    throw new Apierror(403, "You can only update your own feedback");
  }

  // Check if feedback is within 24 hours of creation
  const twentyFourHours = 24 * 60 * 60 * 1000;
  if (Date.now() - feedback.createdAt.getTime() > twentyFourHours) {
    throw new Apierror(400, "Feedback can only be updated within 24 hours");
  }

  if (rating) feedback.rating = rating;
  if (comment !== undefined) feedback.comment = comment;

  await feedback.save();

  const updatedFeedback = await Feedback.findById(id)
    .populate('givenBy', 'username email')
    .populate('order', 'orderNumber')
    .populate('serviceProvider', 'username')
    .populate('rider', 'name');

  res.status(200).json(
    new Apiresponse(200, updatedFeedback, "Feedback updated successfully")
  );
});

export const deleteFeedback = asynchandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new Apierror(404, "Feedback not found");
  }

  if (feedback.givenBy.toString() !== userId.toString() && req.user.role !== "admin") {
    throw new Apierror(403, "Not authorized to delete this feedback");
  }

  // Remove feedback reference from order
  await Orders.findByIdAndUpdate(feedback.order, { $unset: { feedback: 1 } });

  await feedback.deleteOne();

  res.status(200).json(
    new Apiresponse(200, null, "Feedback deleted successfully")
  );
});

export const getFeedbackAnalytics = asynchandler(async (req, res) => {
  const { providerId, riderId } = req.query;
  
  const matchFilter = {};
  if (providerId) matchFilter.serviceProvider = mongoose.Types.ObjectId(providerId);
  if (riderId) matchFilter.rider = mongoose.Types.ObjectId(riderId);

  const analytics = await Feedback.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        ratingDistribution: {
          $push: "$rating"
        }
      }
    }
  ]);

  const ratingBreakdown = await Feedback.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json(
    new Apiresponse(200, {
      overview: analytics[0] || { totalFeedbacks: 0, averageRating: 0 },
      ratingBreakdown
    }, "Feedback analytics fetched successfully")
  );
});
