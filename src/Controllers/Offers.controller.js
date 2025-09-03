import { asynchandler } from "../utils/Asynchandler.js";
import { Offers } from "../models/Offers.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";

export const getAllOffers = asynchandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const totalOffers = await Offers.countDocuments();
  const offers = await Offers.find()
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
  const id=req.user._id;
  const servicerP = await ServiceProviders.findOne({ user: id });

  if (!servicerP) {
    return res.status(404).json({ success: false, message: "Service provider not found" });
  }

  const offers=Offers.find({serviceProvider:servicerP}).populate("serviceProvider servicesIncluded")

  res
  .status(200)
  .json(new Apiresponse(200, offers, "Offer fetched successfully"));
});


export const createOffer = asynchandler(async (req, res) => {
  const {
    title,
    description,
    discountPercentage,
    validFrom,
    validUntil,
    servicesIncluded,
    termsAndConditions,
    price
  } = req.body;

  const id=req.user._id
  const providerExists = await ServiceProviders.findOne({user:id});
  if (!providerExists) {
    throw new Apierror(404, "Service provider not found");
  }

  const newOffer = await Offers.create({
    price,
    title,
    description,
    discountPercentage,
    validFrom,
    validUntil,
    serviceProvider:providerExists._id,
    servicesIncluded,
    termsAndConditions,
  });

  res
    .status(201)
    .json(new Apiresponse(201, newOffer, "Offer created successfully"));
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
