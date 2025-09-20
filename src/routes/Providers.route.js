import { Router } from "express";
import {
  getAllServiceProviders,
  getServiceProviderById,
  getServiceProvidersByService,
  updateServiceProvider,
  deleteServiceProvider,
  getServiceProviderHistoryById,
  getNearestServiceProviders,
  getProviderProfile,
  getProfileStatus,
  updateProviderDeliveryCharges,
  getProviderDeliveryCharges
} from "../Controllers/ServiceProviders.controller.js";
import { verifyAdmin, verifyJWT } from "../middlewares/Authentication.middleware.js";

const router = Router();
// used component 

router.route("/getProfile").get(verifyJWT,getProviderProfile)

router.route("/getAll").get(getAllServiceProviders);
router.route("/getbyid/:id").get(getServiceProviderById);
router.route("/getbyservice/:serviceId").get(getServiceProvidersByService);
router.route("/gethistory/:id").get(getServiceProviderHistoryById);
router.route("/getNearest").get(getNearestServiceProviders);
router.route("/update/:id").put(updateServiceProvider);
router.route("/delete/:id").delete( verifyJWT,verifyAdmin,deleteServiceProvider);
router.route("/getProfileStatus").get(verifyJWT,getProfileStatus)
router.route("/update-delivery-charges").patch(verifyJWT,updateProviderDeliveryCharges);
router.route("/get-delivery-charges").get(verifyJWT,getProviderDeliveryCharges);

export default router;
