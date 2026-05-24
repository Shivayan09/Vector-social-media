import { jest } from "@jest/globals";
import { existsSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock Cloudinary to avoid real API calls
jest.unstable_mockModule("../src/config/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

const { uploadToCloudinary } = await import("../src/utils/uploadCleanup.js");

describe("Upload temp file cleanup", () => {
  describe("uploadToCloudinary helper", () => {
    it("deletes the temp file after a successful upload", async () => {
      const { default: cloudinary } = await import("../src/config/cloudinary.js");
      cloudinary.uploader.upload.mockResolvedValue({
        secure_url: "https://example.com/img.jpg",
        public_id: "test/img",
      });

      const tmpDir = mkdtempSync(join(tmpdir(), "upload-test-"));
      const filePath = join(tmpDir, "test.jpg");
      writeFileSync(filePath, "fake-image-data");

      await uploadToCloudinary({ path: filePath }, { folder: "test" });

      expect(existsSync(filePath)).toBe(false);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("deletes the temp file after a Cloudinary failure", async () => {
      const { default: cloudinary } = await import("../src/config/cloudinary.js");
      cloudinary.uploader.upload.mockRejectedValue(new Error("Upload failed"));

      const tmpDir = mkdtempSync(join(tmpdir(), "upload-test-"));
      const filePath = join(tmpDir, "test.jpg");
      writeFileSync(filePath, "fake-image-data");

      await expect(
        uploadToCloudinary({ path: filePath }, { folder: "test" })
      ).rejects.toThrow("Upload failed");

      expect(existsSync(filePath)).toBe(false);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("does not throw when file path is missing", async () => {
      const { default: cloudinary } = await import("../src/config/cloudinary.js");
      cloudinary.uploader.upload.mockResolvedValue({
        secure_url: "https://example.com/img.jpg",
        public_id: "test/img",
      });

      await expect(
        uploadToCloudinary({}, { folder: "test" })
      ).resolves.toBeDefined();
    });
  });
});
