"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImagesFromCloudinary = exports.uploadImagesToCloudinary = exports.uploadMultipleImages = void 0;
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = require("dotenv");
const cloudinary_1 = require("cloudinary");
const path_1 = __importDefault(require("path"));
// Load environment variables with absolute path
(0, dotenv_1.configDotenv)({ path: path_1.default.join(process.cwd(), "config.env") });
// Configure Cloudinary with validation
const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUD_NAME } = process.env;
// Debug logging
console.log("Environment variables check:", {
    CLOUD_NAME: CLOUD_NAME ? "Set" : "Not set",
    CLOUDINARY_API_KEY: CLOUDINARY_API_KEY ? "Set" : "Not set",
    CLOUDINARY_API_SECRET: CLOUDINARY_API_SECRET ? "Set" : "Not set"
});
if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(`Missing Cloudinary configuration. Required: CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. 
    Found: CLOUD_NAME=${CLOUD_NAME || "undefined"}, API_KEY=${CLOUDINARY_API_KEY ? "set" : "undefined"}, API_SECRET=${CLOUDINARY_API_SECRET ? "set" : "undefined"}`);
}
cloudinary_1.v2.config({
    cloud_name: CLOUD_NAME.trim(),
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});
// Debug: Log the actual configuration being used
console.log("Cloudinary config set with:", {
    cloud_name: CLOUD_NAME ? CLOUD_NAME.trim() : undefined,
    api_key: CLOUDINARY_API_KEY ? "***" + CLOUDINARY_API_KEY.slice(-4) : "undefined",
    api_secret: CLOUDINARY_API_SECRET ? "***" + CLOUDINARY_API_SECRET.slice(-4) : "undefined"
});
// Multer configuration for memory storage
const multerStorage = multer_1.default.memoryStorage();
// File filter to only allow images
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    }
    else {
        cb(new Error("Only image files are allowed"), false);
    }
};
// Configure multer for multiple file uploads
const upload = (0, multer_1.default)({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10, // Maximum 10 files
    },
});
// Export multer middleware for multiple images
exports.uploadMultipleImages = upload.array("images", 10);
// Function to upload multiple images to Cloudinary
const uploadImagesToCloudinary = async (files, folder = "products") => {
    try {
        // Ensure Cloudinary is properly configured before upload
        const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUD_NAME } = process.env;
        if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            throw new Error("Cloudinary configuration not found during upload");
        }
        // Reconfigure Cloudinary to ensure it's properly set
        cloudinary_1.v2.config({
            cloud_name: CLOUD_NAME.trim(),
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET
        });
        console.log("Uploading to Cloudinary with cloud_name:", CLOUD_NAME.trim());
        const uploadPromises = files.map(async (file) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary_1.v2.uploader.upload_stream({
                    resource_type: "image",
                    folder: folder,
                    public_id: `${folder}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    transformation: [
                        { width: 800, height: 800, crop: "limit" }, // Resize images
                        { quality: "auto" }, // Optimize quality
                    ],
                }, (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload error:", error);
                        reject(error);
                    }
                    else if (result) {
                        resolve(result.secure_url);
                    }
                    else {
                        reject(new Error("Upload failed with undefined result"));
                    }
                });
                stream.end(file.buffer);
            });
        });
        const uploadedUrls = await Promise.all(uploadPromises);
        return uploadedUrls;
    }
    catch (error) {
        throw new Error(`Failed to upload images to Cloudinary: ${error}`);
    }
};
exports.uploadImagesToCloudinary = uploadImagesToCloudinary;
// Function to delete images from Cloudinary
const deleteImagesFromCloudinary = async (imageUrls) => {
    try {
        const deletePromises = imageUrls.map(async (url) => {
            const publicId = extractPublicIdFromUrl(url);
            if (publicId) {
                return cloudinary_1.v2.uploader.destroy(publicId);
            }
        });
        await Promise.all(deletePromises);
    }
    catch (error) {
        throw new Error(`Failed to delete images from Cloudinary: ${error}`);
    }
};
exports.deleteImagesFromCloudinary = deleteImagesFromCloudinary;
// Helper function to extract public ID from Cloudinary URL
const extractPublicIdFromUrl = (url) => {
    try {
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split('.')[0];
        return publicId;
    }
    catch (error) {
        return null;
    }
};
