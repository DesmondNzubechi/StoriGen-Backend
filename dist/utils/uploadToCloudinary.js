"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToCloudinary = void 0;
const dotenv_1 = require("dotenv");
const cloudinary_1 = require("cloudinary");
// Load environment variables
(0, dotenv_1.configDotenv)({ path: "./config.env" });
// Configure Cloudinary with validation
const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUD_NAME } = process.env;
console.log(CLOUD_NAME, "The cloud name");
if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(`Missing Cloudinary configuration. Required: CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. 
    Found: CLOUD_NAME=${CLOUD_NAME}, API_KEY=${!!CLOUDINARY_API_KEY}, API_SECRET=${!!CLOUDINARY_API_SECRET}`);
}
cloudinary_1.v2.config({
    secure: true,
    cloud_name: CLOUD_NAME.trim(),
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});
const uploadFileToCloudinary = async (fileBuffer, folder, type, format) => {
    try {
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream({
                resource_type: type, // Automatically detect file type
                folder: folder,
                public_id: `${folder}_${Date.now()}`,
                format: format,
            }, (error, result) => {
                if (error)
                    reject(error);
                else if (result)
                    resolve(result);
                else
                    reject(new Error("Upload failed with undefined result"));
            });
            stream.end(fileBuffer);
        });
        return result;
    }
    catch (error) {
        throw new Error(`"Failed to upload file to Cloudinary. Here is the error" ${error}`);
    }
};
exports.uploadFileToCloudinary = uploadFileToCloudinary;
