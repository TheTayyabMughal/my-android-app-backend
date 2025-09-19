
import { smartUpload } from "../utils/Fileupload.js";

export const uploadMedia = async (req, res) => {
  try {
    console.log(req.files)

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "At least one photo is required." });
    }


    const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

    const imageUrls = [];

    for (const file of filesArray) {
      const uploadedImage = await smartUpload(file);
      if (uploadedImage?.url) {
        imageUrls.push(uploadedImage.url);
      }
    }

    res.status(200).json({ data: imageUrls });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ message: "Failed to upload images" });
  }
};

