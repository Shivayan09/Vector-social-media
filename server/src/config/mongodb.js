import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Database connected!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        console.error(
            "\n💡 Fix checklist:\n" +
            "  1. MongoDB Atlas → Network Access → Add your current IP (or 0.0.0.0/0)\n" +
            "  2. Check your cluster is not PAUSED (free tier pauses after 60 days)\n" +
            "  3. Verify MONGO_URI in server/.env has correct username & password\n"
        );
        process.exit(1);
    }
};

export default connectDB;
