import express from "express";
import {
 createMeasurement, deleteMeasurement, getMeasurementById, getMyMeasurements, updateMeasurement,
 
} from "../Controllers/Measurement.controller.js";
import { verifyJWT } from "../middlewares/Authentication.middleware.js";

const router = express.Router();

router.post('/measurements', verifyJWT, createMeasurement);
router.get('/measurements', verifyJWT, getMyMeasurements);
router.get('/measurements/:id', verifyJWT, getMeasurementById);
router.put('/measurements/:id', verifyJWT, updateMeasurement);
router.delete('/measurements/:id', verifyJWT, deleteMeasurement);

export default router;
