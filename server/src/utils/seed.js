import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../../.env") });

const seedData = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://localhost:27017/vector_social_media";
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        // Clear existing data
        await User.deleteMany();
        await Post.deleteMany();
        console.log("Cleared existing data");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("password123", salt);

        const users = await User.insertMany([
            {
                name: "John",
                surname: "Doe",
                username: "johndoe",
                email: "john@example.com",
                password: hashedPassword,
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
                bio: "Full Stack Developer",
                description: "I love coding and building cool stuff.",
                followers: [],
                following: [],
                isProfileComplete: true
            },
            {
                name: "Jane",
                surname: "Smith",
                username: "janesmith",
                email: "jane@example.com",
                password: hashedPassword,
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
                bio: "UX Researcher",
                description: "Passionate about creating user-centric designs.",
                followers: [],
                following: [],
                isProfileComplete: true
            },
            {
                name: "Alex",
                surname: "Johnson",
                username: "alexj",
                email: "alex@example.com",
                password: hashedPassword,
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
                bio: "Open Source Contributor",
                description: "Contributing to the future of tech.",
                followers: [],
                following: [],
                isProfileComplete: true
            }
        ]);

        console.log("Users created");

        const posts = [
            {
                author: users[0]._id,
                content: "Just started working on this amazing social media platform! #coding #webdev",
                intent: "build",
                likes: [users[1]._id, users[2]._id],
                commentsCount: 2,
                sharesCount: 15
            },
            {
                author: users[1]._id,
                content: "What do you all think about the importance of accessibility in modern web design?",
                intent: "discuss",
                likes: [users[0]._id],
                commentsCount: 5,
                sharesCount: 8
            },
            {
                author: users[2]._id,
                content: "Does anyone know how to optimize vector search in MongoDB?",
                intent: "ask",
                likes: [],
                commentsCount: 0,
                sharesCount: 2
            },
            {
                author: users[0]._id,
                content: "Check out this cool new library I found for animations! #frontend",
                intent: "share",
                likes: [users[1]._id, users[2]._id],
                commentsCount: 1,
                sharesCount: 42
            },
            {
                author: users[1]._id,
                content: "Reflecting on my journey as a designer. It's been a wild ride!",
                intent: "reflect",
                likes: [users[0]._id, users[2]._id],
                commentsCount: 3,
                sharesCount: 0
            }
        ];

        await Post.insertMany(posts);
        console.log("Posts created");

        console.log("Seeding completed successfully!");
        process.exit();
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedData();
