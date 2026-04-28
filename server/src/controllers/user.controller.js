import cloudinary from "../config/cloudinary.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        if (user.avatarPublicId) {
            await cloudinary.uploader.destroy(user.avatarPublicId);
        }
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "avatars",
            transformation: [
                { width: 300, height: 300, crop: "fill" },
                { quality: "auto" },
            ],
        });
        user.avatar = uploadResult.secure_url;
        user.avatarPublicId = uploadResult.public_id;
        await user.save();
        return res.status(200).json({
            success: true,
            avatar: user.avatar,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, name, surname, phoneNumber, bio, description } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        if (username !== undefined) {
            user.username = username;
        }
        if (name !== undefined) {
            user.name = name;
        }
        if (surname !== undefined) {
            user.surname = surname;
        }
        if (phoneNumber !== undefined) {
            user.phoneNumber = phoneNumber;
        }
        if (bio !== undefined) {
            user.bio = bio;
        }
        if (bio.length > 30) {
            return res.json({
                message: "Bio length exceeds word limit!"
            })
        }
        if (description !== undefined) {
            user.description = description;
        }
        await user.save();
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                surname: user.surname,
                phoneNumber: user.phoneNumber,
                bio: user.bio,
                description: user.description,
                avatar: user.avatar,
                isProfileComplete: user.isProfileComplete,
                signupStep: user.signupStep,
            },
            message: "Profile updated successfully!"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const toggleFollowUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;
        if (currentUserId === targetUserId) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }
        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        const isFollowing = currentUser.following.includes(targetUserId);
        if (isFollowing) {
            await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId }, $inc: { followingCount: -1 } });
            await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId }, $inc: { followersCount: -1 } });
            return res.json({
                followed: false
            });
        } else {
            await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId }, $inc: { followingCount: 1 } });
            await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId }, $inc: { followersCount: 1 }, });
            await Notification.create({
                recipient: targetUser._id,
                sender: req.user._id,
                type: "follow",
            });
            return res.json({
                followed: true
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select("name surname username avatar bio description followersCount followingCount").lean();
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFollowers = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("followers", "name username avatar followers");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.followers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getFollowing = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("following", "name username avatar followers");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.following);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const users = await User.find().select("-password").limit(limit).skip(skip);
        res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
        });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id || req.user.id;
        const following = req.user.following || [];

        const suggestedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } },
                { _id: { $nin: following } }
            ]
        }).select("name username bio avatar followers following").limit(10);

        res.status(200).json({
            success: true,
            users: suggestedUsers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch suggested users",
            error: error.message
        });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json({ users: [] });
        }
        const users = await User.find({ $or: [{ name: { $regex: query, $options: "i" } }, { username: { $regex: query, $options: "i" } }] }).select("-password").limit(10);
        res.json({ users });
    } catch {
        res.status(500).json({
            message: "Search failed"
        });
    }
};
