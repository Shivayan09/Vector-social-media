import mongoose from "mongoose";

const connectDB = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("Database connected!");
    } catch (error) {
        console.log("MongoDB Atlas connection failed. Attempting fallback to in-memory database...");
        try {
            const { MongoMemoryServer } = await import("mongodb-memory-server");
            const mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();
            console.log("In-memory MongoDB started at:", uri);
            await mongoose.connect(uri);
            console.log("Connected to in-memory database successfully! (Note: Data will be reset on server restart)");
        } catch (fallbackError) {
            console.error("In-memory MongoDB fallback also failed:", fallbackError);
            throw error;
        }
    }
};

export default connectDB;