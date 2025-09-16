import { asynchandler } from "../utils/Asynchandler.js";
import { Offers } from "../models/Offers.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";

export const getAllOffers = asynchandler(async (req, res) => {
  const userId = req.id;
  const offers = await Offers.find({ serviceProvider: userId })
  if (!offers) {
    throw new Apierror(404, "No offers found");
  }
  return res
    .status(200)
    .json(new Apiresponse(200, offers, "Offers fetched successfully"));
});

export const getOfferById = asynchandler(async (req, res) => {
  const offer = await Offers.findById(req.params.id).populate(
    "serviceProvider servicesIncluded"
  );

  if (!offer) {
    throw new Apierror(404, "Offer not found");
  }

  res
    .status(200)
    .json(new Apiresponse(200, offer, "Offer fetched successfully"));
});

export const getOffersByServiceProvider = asynchandler(async (req, res) => {
  const { providerId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const totalOffers = await Offers.countDocuments({ serviceProvider: providerId });
  const offers = await Offers.find({ serviceProvider: providerId })
    .populate("serviceProvider servicesIncluded")
    .skip((page - 1) * limit)
    .limit(limit);

  const hasNextPage = page * limit < totalOffers;

  res.status(200).json({
    success: true,
    offers,
    currentPage: page,
    totalPages: Math.ceil(totalOffers / limit),
    nextPage: hasNextPage ? page + 1 : null,
  });
});


export const getOffersByToken = asynchandler(async (req, res) => {
  const id = req.user._id;
  const servicerP = await ServiceProviders.findOne({ user: id });

  if (!servicerP) {
    return res.status(404).json({ success: false, message: "Service provider not found" });
  }

  const offers = Offers.find({ serviceProvider: servicerP }).populate("serviceProvider servicesIncluded")

  res
    .status(200)
    .json(new Apiresponse(200, offers, "Offer fetched successfully"));
});


export const createOffer = asynchandler(async (req, res) => {
  const {
    title,
    description,
    discountPercentage,
    servicesIncluded,
  } = req.body;
  const id = req.id
  const providerExists = await ServiceProviders.findById(id);
  if (!providerExists) {
    throw new Apierror(404, "Service provider not found");
  }

  const newOffer = await Offers.create({
    title,
    description,
    discountPercentage,
    serviceProvider: providerExists._id,
    servicesIncluded,
  });

  res
    .status(201)
    .json(new Apiresponse(201, newOffer, "Offer created successfully"));
});


export const getNearbyOffers = asynchandler(async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "Provide lat and lng" });
    
    
    const nearbyProviders = await ServiceProviders.find({
      profileStatus: true,
      currentLocation: {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], 10 / 6371]
        }
      }
    });

    const providerIds = nearbyProviders.map(p => p._id);

    // Get active offers from these providers and populate all needed fields
    const offers = await Offers.find({
      serviceProvider: { $in: providerIds },
      isActive: true
    }).populate("serviceProvider", "username phoneNo shopAddress servicesOffered");

    res.json({ offers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export const getProviderProfileStatus = asynchandler(async (req, res) => {
  const userId = req.id;

  try {
    const user = await ServiceProviders.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" }); 
    }

    res.status(200).json({ status: user.profileStatus });
  } catch (err) {
    console.error("Error in getProviderProfileStatus:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export const toggleProfileStatus = asynchandler(async (req, res) => {
  const userId = req.id; 
  const { isActive } = req.body;
  console.log("isActive: ",req.body)
  try {
    const user = await ServiceProviders.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profileStatus = isActive;
    await user.save();

    return res.status(200).json({
      message: "Profile status updated successfully",
      status: user.profileStatus,
    });
  } catch (err) {
    console.error("Error in toggleProfileStatus:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


export const toggleOfferById = asynchandler(async (req, res) => {
  const offerId = req.params.id;
  const offer = await Offers.findById(offerId);
  if (!offer) {
    throw new Apierror(404, "Offer not found");
  }

  offer.isActive = !offer.isActive;
  await offer.save();
  return res
    .status(200)
    .json(new Apiresponse(200, offer, "Offer status toggled successfully"));
});

export const updateOffer = asynchandler(async (req, res) => {
  const {
    price,
    title,
    description,
    discountPercentage,
    validFrom,
    validUntil,
    servicesIncluded,
    termsAndConditions,
    isActive,
  } = req.body;

  const updatedOffer = await Offers.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        price,
        title,
        description,
        discountPercentage,
        validFrom,
        validUntil,
        servicesIncluded,
        termsAndConditions,
        isActive,
      },
    },
    { new: true }
  ).populate("serviceProvider servicesIncluded");

  if (!updatedOffer) {
    throw new Apierror(404, "Offer not found");
  }

  res
    .status(200)
    .json(new Apiresponse(200, updatedOffer, "Offer updated successfully"));
});

export const deleteOffer = asynchandler(async (req, res) => {
  const offer = await Offers.findById(req.params.id);

  if (!offer) {
    throw new Apierror(404, "Offer not found");
  }

  await offer.deleteOne();

  res.status(200).json(new Apiresponse(200, {}, "Offer deleted successfully"));
});
