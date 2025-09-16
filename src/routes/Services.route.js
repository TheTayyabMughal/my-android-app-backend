import { Router } from "express";
import {
  createService, getAllServices, getServiceById, updateService, deleteService,getServicesForProvider
} from "../Controllers/Services.controller.js";
import { verifyAdmin, verifyJWT } from "../middlewares/Authentication.middleware.js";
const router = Router();


router.route("/createservice").post(verifyJWT, createService);
router.route("/updateservice/:id").put(verifyJWT, updateService);
router.route("/delete/:id").delete(verifyJWT, deleteService)
router.route("/getAll").get(getAllServices);
router.route("/getbyid/:id").get(getServiceById);
router.route("/getServicesForProvider").get(verifyJWT,getServicesForProvider)



export default router;
