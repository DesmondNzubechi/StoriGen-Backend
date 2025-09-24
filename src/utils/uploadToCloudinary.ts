import { configDotenv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { UploadApiResponse } from "cloudinary";

// Load environment variables
configDotenv({ path: "./config.env" });

// Configure Cloudinary with validation
const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUD_NAME } = process.env;
console.log(CLOUD_NAME, "The cloud name")
if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error(`Missing Cloudinary configuration. Required: CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. 
    Found: CLOUD_NAME=${CLOUD_NAME}, API_KEY=${!!CLOUDINARY_API_KEY}, API_SECRET=${!!CLOUDINARY_API_SECRET}`);
}

cloudinary.config({
  secure: true,
  cloud_name: CLOUD_NAME.trim(),
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

export const uploadFileToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  type: string | any,
  format: string
): Promise<UploadApiResponse> => {
  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: type, // Automatically detect file type
          folder: folder,
          public_id: `${folder}_${Date.now()}`,
          format: format,
        },
        (error: any, result: UploadApiResponse | undefined) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error("Upload failed with undefined result"));
        }
      );

      stream.end(fileBuffer);
    });

    return result;
  } catch (error) {
    throw new Error(`"Failed to upload file to Cloudinary. Here is the error" ${error}`);
  }
};
