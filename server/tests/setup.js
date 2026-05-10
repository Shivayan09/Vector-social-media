import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

let mongoServer;

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'dummy_id';
process.env.GOOGLE_CLIENT_SECRET = 'dummy_secret';

jest.setTimeout(60000);

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } catch (error) {
    console.error("Failed to start MongoMemoryServer:", error);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
});

// Note: For ESM projects, it's often better to mock modules in individual test files
// using jest.unstable_mockModule() or by using mock objects in the setup.
