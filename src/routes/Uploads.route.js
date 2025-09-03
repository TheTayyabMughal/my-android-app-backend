import express from "express";
import { uploadMedia } from "../Controllers/Uploadingendpoint.js";
import { upload } from "../middlewares/Multer.middleware.js";

const router = express.Router();

router
  .route("/upload")
  .post(upload.fields([{ name: "files", maxCount: 10 }]), uploadMedia);

export default router;
