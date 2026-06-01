import { readFile, unlink } from "fs/promises";

export const IMAGE_UPLOAD_LIMITS = {
  post: 2 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
};

const IMAGE_TYPES = {
  jpeg: {
    mimeTypes: new Set(["image/jpeg", "image/jpg"]),
    matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  png: {
    mimeTypes: new Set(["image/png"]),
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  gif: {
    mimeTypes: new Set(["image/gif"]),
    matches: (buffer) => buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")),
  },
  webp: {
    mimeTypes: new Set(["image/webp"]),
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
  avif: {
    mimeTypes: new Set(["image/avif"]),
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["avif", "avis"].includes(buffer.subarray(8, 12).toString("ascii")),
  },
};

function uploadError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function detectImageType(buffer) {
  return Object.entries(IMAGE_TYPES).find(([, type]) => type.matches(buffer))?.[0] || null;
}

function formatAllowedTypes(allowedFormats) {
  return allowedFormats.map((format) => format.toUpperCase()).join(", ");
}

export async function cleanupTempUpload(file) {
  if (file?.path) {
    await unlink(file.path).catch(() => {});
  }
}

export async function validateImageUpload(file, { allowedFormats, maxSize, label = "file" }) {
  if (!file) return null;

  if (!allowedFormats?.length) {
    throw uploadError("No image formats are configured for upload validation");
  }

  if (file.size > maxSize) {
    throw uploadError(`${label} must be ${Math.floor(maxSize / (1024 * 1024))}MB or smaller`);
  }

  const allowed = new Set(allowedFormats);
  const buffer = await readFile(file.path);
  const detectedFormat = detectImageType(buffer);

  if (!detectedFormat || !allowed.has(detectedFormat)) {
    throw uploadError(`Only valid ${formatAllowedTypes(allowedFormats)} images are allowed`);
  }

  if (!IMAGE_TYPES[detectedFormat].mimeTypes.has(file.mimetype)) {
    throw uploadError("Uploaded file content does not match its declared image type");
  }

  return detectedFormat;
}
