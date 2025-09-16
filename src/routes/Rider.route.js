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

router.post("/create",verifyJWT,createRider); 
router.get("/getAll",getAllRiders); 
router.put("/update/:id", updateRider); 
router.delete("/delete/:id",verifyJWT,deleteRider);
router.get("/getByProvider",verifyJWT,getRiderByProvider);
router.get("/:id", getRiderById); 


export default router;
