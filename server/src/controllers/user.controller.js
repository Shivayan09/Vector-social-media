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
        
        if (currentUser.blockedUsers?.some(id => id.toString() === targetUserId) || targetUser.blockedUsers?.some(id => id.toString() === currentUserId)) {
            return res.status(403).json({
                message: "Action not allowed due to blocking"
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
        const user = await User.findOne({ username }).select("name surname username avatar bio description followersCount followingCount blockedUsers").lean();
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        
        if (req.user) {
            const isBlockedByTarget = user.blockedUsers?.some(id => id.toString() === req.user._id.toString());
            const hasBlockedTarget = req.user.blockedUsers?.some(id => id.toString() === user._id.toString());
            
            if (isBlockedByTarget || hasBlockedTarget) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
        }
        delete user.blockedUsers; // Don't expose this field

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
        
        const query = {};
        if (req.user) {
            query._id = { $nin: [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])] };
        }
        
        const users = await User.find(query).select("-password").limit(limit).skip(skip);
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

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json({ users: [] });
        }
        const queryObj = { 
            $or: [{ name: { $regex: query, $options: "i" } }, { username: { $regex: query, $options: "i" } }] 
        };
        if (req.user) {
            queryObj._id = { $nin: [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])] };
        }
        const users = await User.find(queryObj).select("-password").limit(10);
        res.json({ users });
    } catch {
        res.status(500).json({
            message: "Search failed"
        });
    }
};

export const blockUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;
        
        if (currentUserId === targetUserId) {
            return res.status(400).json({ message: "You cannot block yourself" });
        }
        
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Add to block lists
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { blockedUsers: targetUserId } });
        await User.findByIdAndUpdate(targetUserId, { $addToSet: { blockedBy: currentUserId } });
        
        // Remove from follows if existing
        const currentUser = await User.findById(currentUserId);
        const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);
        if (isFollowing) {
            await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId }, $inc: { followingCount: -1 } });
            await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId }, $inc: { followersCount: -1 } });
        }
        const isFollowedBy = currentUser.followers.some(id => id.toString() === targetUserId);
        if (isFollowedBy) {
            await User.findByIdAndUpdate(currentUserId, { $pull: { followers: targetUserId }, $inc: { followersCount: -1 } });
            await User.findByIdAndUpdate(targetUserId, { $pull: { following: currentUserId }, $inc: { followingCount: -1 } });
        }
        
        return res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;
        
        await User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: targetUserId } });
        await User.findByIdAndUpdate(targetUserId, { $pull: { blockedBy: currentUserId } });
        
        return res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
