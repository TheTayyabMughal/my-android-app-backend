import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// ✅ Cloudinary Configuration with HTTPS enforcement
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // ✅ Force HTTPS URLs for APK compatibility
});

// For local development (file path)
const uploadonCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
          resource_type: "auto",
          secure: true, // ✅ Force HTTPS URLs
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
          secure: true, // ✅ Force HTTPS URLs
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
        let response;
        // Check if we're on Vercel (memory storage) or local (disk storage)
        if (file.buffer) {
            // Vercel environment - use buffer
            response = await uploadonCloudinaryFromBuffer(file.buffer, file.originalname);
        } else {
            // Local environment - use file path
            response = await uploadonCloudinary(file.path);
        }
        
        // ✅ Ensure HTTPS URLs
        if (response && response.url) {
            const originalUrl = response.url;
            response.url = response.url.replace(/^http:\/\//, 'https://');
            if (originalUrl !== response.url) {
                console.log(`✅ Converted HTTP to HTTPS: ${originalUrl} → ${response.url}`);
            }
        }
        if (response && response.secure_url) {
            const originalSecureUrl = response.secure_url;
            response.secure_url = response.secure_url.replace(/^http:\/\//, 'https://');
            if (originalSecureUrl !== response.secure_url) {
                console.log(`✅ Converted HTTP to HTTPS: ${originalSecureUrl} → ${response.secure_url}`);
            }
        }
        
        return response;
    } catch (error) {
        return null;
    }
};

// ✅ Utility function to ensure HTTPS URLs
const ensureHttpsUrl = (url) => {
  if (!url) return url;
  return url.replace(/^http:\/\//, 'https://');
};

// ✅ Enhanced smart upload function with HTTPS guarantee
const smartUploadWithHttps = async (file) => {
  if (!file) {
    return null;
  }
  
  try {
    let response;
    // Check if we're on Vercel (memory storage) or local (disk storage)
    if (file.buffer) {
      // Vercel environment - use buffer
      response = await uploadonCloudinaryFromBuffer(file.buffer, file.originalname);
    } else {
      // Local environment - use file path
      response = await uploadonCloudinary(file.path);
    }
    
    // Ensure the returned URL is HTTPS
    if (response && response.url) {
      const originalUrl = response.url;
      response.url = ensureHttpsUrl(response.url);
      if (originalUrl !== response.url) {
        console.log(`✅ Enhanced: Converted HTTP to HTTPS: ${originalUrl} → ${response.url}`);
      }
    }
    if (response && response.secure_url) {
      const originalSecureUrl = response.secure_url;
      response.secure_url = ensureHttpsUrl(response.secure_url);
      if (originalSecureUrl !== response.secure_url) {
        console.log(`✅ Enhanced: Converted HTTP to HTTPS: ${originalSecureUrl} → ${response.secure_url}`);
      }
    }
    
    return response;
  } catch (error) {
    return null;
  }
};

export { uploadonCloudinary, uploadonCloudinaryFromBuffer, smartUpload, smartUploadWithHttps, ensureHttpsUrl };