import express from "express";
import {
 createMeasurement, deleteMeasurement, getMeasurementById, updateMeasurement,getMeasurementsWithProvider
} from "../Controllers/Measurement.controller.js";
import { verifyJWT } from "../middlewares/Authentication.middleware.js";

const router = express.Router();
router.get("/get", verifyJWT, getMeasurementsWithProvider);

router.post('/create', verifyJWT, createMeasurement);
//router.get('/measurements', verifyJWT, getMyMeasurements);
router.get('/measurements/:id', verifyJWT, getMeasurementById);
router.put('/measurements/:id', verifyJWT, updateMeasurement);
router.delete('/measurements/:id', verifyJWT, deleteMeasurement);

export default router;
