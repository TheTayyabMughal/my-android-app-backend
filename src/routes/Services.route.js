import { Router } from "express";
import {
  createService,getAllServices,getServiceById,updateService,deleteService
} from "../Controllers/Services.controller.js";
import { verifyAdmin, verifyJWT } from "../middlewares/Authentication.middleware.js";
const router = Router();


  router.route("/createservice").post(verifyJWT,verifyAdmin,createService);
  router.route("/updateservice/:id").put(verifyJWT,verifyAdmin,updateService);
  router.route("/delete/:id").delete(verifyJWT,verifyAdmin,deleteService)
  router.route("/getAll").get(getAllServices);
  router.route("/getbyid/:id").get(getServiceById);



  export default router;
