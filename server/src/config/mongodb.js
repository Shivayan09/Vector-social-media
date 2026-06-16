import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 5000,
          heartbeatFrequencyMS: 10000,
          maxPoolSize: 10,
          retryWrites: true,
          socketTimeoutMS: 45000,
        });
        console.log("Database connected!");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};

export default connectDB;