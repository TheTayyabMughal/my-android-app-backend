import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: "dzimvfruh",
  api_key: "153942893436472",
  api_secret: "wcRdRcpNnv5tPwG4AB4YqkLjH48",
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