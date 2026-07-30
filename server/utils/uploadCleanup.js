import cloudinary from "../config/cloudinary.js";
import { unlink } from "fs/promises";

export const uploadToCloudinary = async (file, options) => {
  try {
    return await cloudinary.uploader.upload(file.path, options);
  } finally {
    if (file?.path) {
      await unlink(file.path).catch((error) => {
        console.error("Failed to clean up temp file:", file.path, error.message);
      });
    }
  }
};
