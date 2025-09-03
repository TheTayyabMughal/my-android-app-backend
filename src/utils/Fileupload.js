import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: "dvmccihlf",
  api_key: "143439724258563",
  api_secret: "yZS0GKhjWuxbysnHae5J-6ZInYE",
});

const uploadonCloudinary=async (localFilePath)=>{

    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
          resource_type: "auto",
        });
        fs.unlinkSync(localFilePath);
        return response;
      } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
      }
    };

export {uploadonCloudinary};