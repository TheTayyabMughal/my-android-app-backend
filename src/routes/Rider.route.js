import express from "express";
import {
  createRider,
  getAllRiders,
  getRiderById,
  updateRider,
  deleteRider,
  getRiderByProvider,
} from "../Controllers/Rider.controller.js";
import { verifyAdmin, verifyJWT, verifyProvider, verifyProviderOrAdmin } from "../middlewares/Authentication.middleware.js";

const router = express.Router();

router.post("/create",verifyJWT, verifyProvider,createRider); 
router.get("/getAll",getAllRiders); 
router.put("/:id", updateRider); 
router.delete("/:id",verifyJWT,verifyProviderOrAdmin,deleteRider);
router.get("/getByProvider",verifyJWT,verifyProvider ,getRiderByProvider);
router.get("/:id", getRiderById); 


export default router;
