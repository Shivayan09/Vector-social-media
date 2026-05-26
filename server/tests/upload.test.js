import { jest } from "@jest/globals";
import { Writable } from "stream";

// Minimal JPEG: FF D8 FF header is sufficient for file-type detection
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
// PNG: signature (8) + IHDR chunk length (4) + "IHDR" (4) + width/height/depth/color (13) = 29 bytes minimum
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00,
]);
// WebP magic bytes: RIFF....WEBP
const WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
]);
// SVG disguised as image/jpeg — not a real image
const SVG_BUFFER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
// HTML disguised as image/jpeg
const HTML_BUFFER = Buffer.from("<!DOCTYPE html><html><body>xss</body></html>");
// Arbitrary binary with no recognisable header
const UNKNOWN_BUFFER = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

const makeUploadStreamMock = (result) =>
  jest.fn((_options, callback) => {
    const writable = new Writable({ write(_chunk, _enc, done) { done(); } });
    process.nextTick(() => callback(null, result));
    return writable;
  });

const makeUploadStreamErrorMock = (err) =>
  jest.fn((_options, callback) => {
    const writable = new Writable({ write(_chunk, _enc, done) { done(); } });
    process.nextTick(() => callback(err, null));
    return writable;
  });

jest.unstable_mockModule("../src/config/cloudinary.js", () => ({
  default: {
    uploader: {
      upload_stream: makeUploadStreamMock({
        secure_url: "https://example.com/img.jpg",
        public_id: "test/img",
      }),
      destroy: jest.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

const { uploadToCloudinary } = await import("../src/utils/uploadCleanup.js");
const { validateImageBuffer, ALLOWED_MIME_TYPES } = await import("../src/utils/validateFileType.js");

describe("uploadToCloudinary helper", () => {
  it("resolves with the Cloudinary result on success", async () => {
    const result = await uploadToCloudinary({ buffer: JPEG_BUFFER }, { folder: "test" });
    expect(result).toMatchObject({ secure_url: expect.any(String), public_id: expect.any(String) });
  });

  it("rejects when Cloudinary returns an error", async () => {
    const { default: cloudinary } = await import("../src/config/cloudinary.js");
    cloudinary.uploader.upload_stream = makeUploadStreamErrorMock(new Error("Upload failed"));

    await expect(
      uploadToCloudinary({ buffer: JPEG_BUFFER }, { folder: "test" })
    ).rejects.toThrow("Upload failed");

    cloudinary.uploader.upload_stream = makeUploadStreamMock({
      secure_url: "https://example.com/img.jpg",
      public_id: "test/img",
    });
  });

  it("pipes the buffer through the upload stream", async () => {
    const { default: cloudinary } = await import("../src/config/cloudinary.js");
    const chunks = [];
    cloudinary.uploader.upload_stream = jest.fn((_options, callback) => {
      const writable = new Writable({
        write(chunk, _enc, done) { chunks.push(chunk); done(); },
      });
      process.nextTick(() => callback(null, { secure_url: "https://example.com/img.jpg", public_id: "test/img" }));
      return writable;
    });

    await uploadToCloudinary({ buffer: PNG_BUFFER }, { folder: "test" });
    expect(Buffer.concat(chunks)).toEqual(PNG_BUFFER);
  });
});

describe("validateImageBuffer — magic byte detection", () => {
  it("accepts a genuine JPEG buffer", async () => {
    const { valid, detectedType } = await validateImageBuffer(JPEG_BUFFER);
    expect(valid).toBe(true);
    expect(detectedType).toBe("image/jpeg");
  });

  it("accepts a genuine PNG buffer", async () => {
    const { valid, detectedType } = await validateImageBuffer(PNG_BUFFER);
    expect(valid).toBe(true);
    expect(detectedType).toBe("image/png");
  });

  it("accepts a genuine WebP buffer", async () => {
    const { valid, detectedType } = await validateImageBuffer(WEBP_BUFFER);
    expect(valid).toBe(true);
    expect(detectedType).toBe("image/webp");
  });

  it("rejects an SVG file regardless of declared MIME type", async () => {
    const { valid, detectedType } = await validateImageBuffer(SVG_BUFFER);
    expect(valid).toBe(false);
    expect(ALLOWED_MIME_TYPES).not.toContain(detectedType);
  });

  it("rejects an HTML file disguised as an image", async () => {
    const { valid } = await validateImageBuffer(HTML_BUFFER);
    expect(valid).toBe(false);
  });

  it("rejects an arbitrary binary with no recognised magic bytes", async () => {
    const { valid, detectedType } = await validateImageBuffer(UNKNOWN_BUFFER);
    expect(valid).toBe(false);
    expect(detectedType).toBeNull();
  });

  it("rejects a file with no extension but correct JPEG magic bytes — valid should be true", async () => {
    const { valid, detectedType } = await validateImageBuffer(JPEG_BUFFER);
    expect(valid).toBe(true);
    expect(detectedType).toBe("image/jpeg");
  });

  it("exposes only the three safe types in ALLOWED_MIME_TYPES", () => {
    expect(ALLOWED_MIME_TYPES).toEqual(
      expect.arrayContaining(["image/jpeg", "image/png", "image/webp"])
    );
    expect(ALLOWED_MIME_TYPES).toHaveLength(3);
  });
});
