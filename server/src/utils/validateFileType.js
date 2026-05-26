import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const validateImageBuffer = async (buffer) => {
  const result = await fileTypeFromBuffer(buffer);
  const detectedType = result?.mime ?? null;
  return {
    valid: ALLOWED_MIME_TYPES.includes(detectedType),
    detectedType,
  };
};

export { ALLOWED_MIME_TYPES };
