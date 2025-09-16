import { Router } from "express";
import {
  getAllOffers,
  getOfferById,
  getOffersByServiceProvider,
  createOffer,
  updateOffer,
  deleteOffer,
  getOffersByToken,
  toggleOfferById,
  getNearbyOffers,
  getProviderProfileStatus,
  toggleProfileStatus
} from "../Controllers/Offers.controller.js";
import { verifyJWT, verifyProvider, verifyProviderOrAdmin } from "../middlewares/Authentication.middleware.js";

const router = Router();

router.route("/getAll").get(verifyJWT,getAllOffers);
router.route("/getProviderProfileStatus").get(verifyJWT,getProviderProfileStatus)
router.route("/toggle-status").patch(verifyJWT,toggleProfileStatus) 
router.route("/nearby").get(verifyJWT, getNearbyOffers);


// ###############################################################
router.route("/getbyid/:id").get(getOfferById);
router.route("/toggle/:id").patch(verifyJWT,toggleOfferById);
router.route("/getbyprovider/:providerId").get(getOffersByServiceProvider);
router.route("/getbytoken").get(verifyJWT,verifyProvider,getOffersByToken);
//router.route("/create").post( verifyJWT,verifyProvider,createOffer);
router.route("/create").post(verifyJWT,createOffer);
router.route("/delete/:id").delete( verifyJWT,verifyProviderOrAdmin,deleteOffer);
router.route("/update/:id").put( verifyJWT,verifyProvider,updateOffer);

export default router;
