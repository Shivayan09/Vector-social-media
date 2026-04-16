import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MongoDB not configured. Skipping DB connection.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

export default connectDB;