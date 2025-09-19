import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// For local development (file path)
const uploadonCloudinary = async (localFilePath) => {
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

// For Vercel deployment (memory buffer)
const uploadonCloudinaryFromBuffer = async (fileBuffer, originalName) => {
    try {
        if (!fileBuffer) return null;
        
        // Convert buffer to base64 string for Cloudinary
        const base64String = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
        
        const response = await cloudinary.uploader.upload(base64String, {
          resource_type: "auto",
          public_id: `profile_${Date.now()}_${originalName}`,
        });
        
        return response;
    } catch (error) {
        return null;
    }
};

// Smart upload function that works for both environments
const smartUpload = async (file) => {
    if (!file) {
        return null;
    }
    
    try {
        // Check if we're on Vercel (memory storage) or local (disk storage)
        if (file.buffer) {
            // Vercel environment - use buffer
            return await uploadonCloudinaryFromBuffer(file.buffer, file.originalname);
        } else {
            // Local environment - use file path
            return await uploadonCloudinary(file.path);
        }
    } catch (error) {
        return null;
    }
};

export { uploadonCloudinary, uploadonCloudinaryFromBuffer, smartUpload };