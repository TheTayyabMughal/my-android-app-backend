import multer from "multer";
import fs from "fs";

// Smart storage configuration - works for both local and Vercel
const createStorage = () => {
  // Check if we're on Vercel (serverless environment)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Use memory storage for Vercel
    return multer.memoryStorage();
  } else {
    // Use disk storage for local development
    // Ensure temp directory exists
    const tempDir = './public/temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return multer.diskStorage({
      destination: function(req, file, cb) {
        cb(null, tempDir);
      },
      filename: function(req, file, cb) {
        cb(null, file.originalname);
      },
    });
  }
};

const storage = createStorage();

// File filter for profile pictures
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// Specific upload middleware for profile pictures
export const uploadProfilePic = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
}).single('profilePic');