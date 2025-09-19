import { Feedback } from "../models/Feedback.model.js";
import { Orders } from "../models/Orders.js";
import { Riders } from "../models/Rider.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import mongoose from "mongoose";

export const createFeedback = asynchandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, serviceProvider, rating, comment } = req.body;
    const userId = req.id; // Logged-in user

    if (!orderId || !serviceProvider || !rating) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Create feedback
    const newFeedback = new Feedback({
      rating,
      comment,
      givenBy: userId,
      order: orderId,
      serviceProvider,
    });

    await newFeedback.save({ session });

    // Update Orders collection: mark feedback given
    await Orders.findByIdAndUpdate(
      orderId,
      { isFeedBackGiven: true },
      { session }
    );

    // Calculate average rating for this service provider using aggregation
    const result = await Feedback.aggregate([
      { $match: { serviceProvider: new mongoose.Types.ObjectId(serviceProvider) } },
      { $group: { _id: "$serviceProvider", avgRating: { $avg: "$rating" } } },
    ]).session(session);

    let avgRating = result.length ? result[0].avgRating : 0;

    // Round to nearest half for star display
    avgRating = Math.round(avgRating * 2) / 2;

    // Update service provider
    await ServiceProviders.findByIdAndUpdate(
      serviceProvider,
      { rating: avgRating },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, message: "Review submitted successfully", avgRating });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
(err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "You have already submitted a review for this order." });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
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
  try {
    const { id } = req.params;

    // Validate if the provider exists
    const provider = await ServiceProviders.findById(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found"
      });
    }

    // Get all reviews for this provider with user details
    const reviews = await Feedback.find({ serviceProvider: id })
      .populate("givenBy", "username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews: reviews
    });
  } catch (error) {
("Error fetching provider reviews:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching reviews"
    });
  }
});

export const getProviderForFeedback = asynchandler(async (req, res) => {
  try {
    const providers = await ServiceProviders.find({
      approvalFromAdmin: true,
    }).select("-password -otp -otpExpiry -refreshToken");

    // Calculate average rating for each provider
    const providersWithRatings = await Promise.all(
      providers.map(async (provider) => {
        const reviews = await Feedback.find({
          serviceProvider: provider._id
        });

        let averageRating = 0;
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          averageRating = totalRating / reviews.length;
        }

        return {
          ...provider.toObject(),
          rating: averageRating
        };
      })
    );

    res.status(200).json({
      success: true,
      count: providersWithRatings.length,
      providers: providersWithRatings
    });
  } catch (error) {
("Error fetching service providers:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching service providers"
    });
  }
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
