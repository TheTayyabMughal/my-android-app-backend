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
    const { lat, lng, search } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "Provide lat and lng" });
    }

    console.log(`🔍 Searching for providers near: ${lat}, ${lng}`);
    if (search) {
      console.log(`🔎 Search term: ${search}`);
    }

    // ✅ Find ALL nearby providers within 10km (not just those with offers)
    let query = {
      profileStatus: true,
      approvalFromAdmin: true,
      currentLocation: {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], 10 / 6371], // 10km radius
        },
      },
    };

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { username: searchRegex },
        { shopAddress: searchRegex },
        { 'servicesOffered.name': searchRegex }
      ];
      console.log(`🔎 Search query:`, JSON.stringify(query, null, 2));
    }

    const nearbyProviders = await ServiceProviders.find(query)
      .populate('servicesOffered', 'name description')
      .select('username phoneNo shopAddress servicesOffered currentLocation profilePic');

    console.log(`📍 Found ${nearbyProviders.length} nearby providers`);
    if (search && search.trim()) {
      console.log(`🔍 Providers matching "${search}":`, nearbyProviders.map(p => ({
        username: p.username,
        shopAddress: p.shopAddress,
        services: p.servicesOffered?.map(s => s.name) || []
      })));
    }

    // ✅ Get offers for these providers (optional - providers can exist without offers)
    const providerIds = nearbyProviders.map((p) => p._id);
    const offers = await Offers.find({
      serviceProvider: { $in: providerIds },
      isActive: true,
    }).populate("serviceProvider", "username phoneNo shopAddress servicesOffered currentLocation profilePic");

    console.log(`🎁 Found ${offers.length} active offers`);

    // ✅ Create provider groups (with or without offers)
    const groupedOffers = nearbyProviders.map(provider => {
      // Find offers for this provider
      const providerOffers = offers.filter(offer => 
        offer.serviceProvider._id.toString() === provider._id.toString()
      );

      return {
        provider: {
          _id: provider._id,
          username: provider.username,
          phoneNo: provider.phoneNo,
          shopAddress: provider.shopAddress,
          servicesOffered: provider.servicesOffered,
          profilePic: provider.profilePic,
          location: provider.currentLocation.coordinates,
        },
        offers: providerOffers.map(offer => ({
          _id: offer._id,
          title: offer.title,
          description: offer.description,
          discountPercentage: offer.discountPercentage,
          servicesIncluded: offer.servicesIncluded,
        }))
      };
    });

    console.log(`📦 Final grouped offers: ${groupedOffers.length} providers`);
    groupedOffers.forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.provider.username} - ${group.offers.length} offers`);
    });

    return res.json({ groupedOffers });
  } catch (err) {
    console.error("❌ getNearbyOffers Error:", err);
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
