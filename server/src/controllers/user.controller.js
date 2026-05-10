import cloudinary from "../config/cloudinary.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import { getIO, onlineUsers } from "../socket/socket.js";

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
        const { username, name, surname, phoneNumber, bio, description, isPrivate } = req.body;
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
            if (bio.length > 30) {
                return res.status(400).json({
                    success: false,
                    message: "Bio length exceeds word limit!"
                });
            }
            user.bio = bio;
        }
        if (description !== undefined) {
            user.description = description;
        }
        if (isPrivate !== undefined) {
            user.isPrivate = isPrivate;
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
                isPrivate: user.isPrivate,
                followRequests: user.followRequests.map(id => id.toString()),
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
        if (!currentUser) {
            return res.status(404).json({
                message: "Current user not found"
            });
        }
        if (!targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        const isFollowing = currentUser.following.includes(targetUserId);
        if (isFollowing) {
            // Unfollow logic (same as before)
            await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId }, $inc: { followingCount: -1 } });
            await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId }, $inc: { followersCount: -1 } });
            return res.json({
                followed: false
            });
        } else {
            // Check if account is private
            if (targetUser.isPrivate) {
                const alreadyRequested = targetUser.followRequests.some(id => id.toString() === currentUserId);
                if (alreadyRequested) {
                    // Cancel follow request
                    await User.findByIdAndUpdate(targetUserId, { $pull: { followRequests: currentUserId } });
                    // Optionally delete the notification
                    await Notification.deleteOne({ recipient: targetUserId, sender: currentUserId, type: "follow_request" });
                    return res.json({
                        requested: false,
                        message: "Follow request cancelled"
                    });
                } else {
                    // Create follow request
                    await User.findByIdAndUpdate(targetUserId, { $addToSet: { followRequests: currentUserId } });
                    const notification = await Notification.create({
                        recipient: targetUser._id,
                        sender: req.user._id,
                        type: "follow_request",
                    });
                    const recipientSocket = onlineUsers.get(targetUser._id.toString());
                    if (recipientSocket) {
                        getIO().to(recipientSocket).emit("notification:new", {
                            notificationId: notification._id,
                            type: notification.type,
                        });
                    }
                    return res.json({
                        requested: true,
                        message: "Follow request sent"
                    });
                }
            } else {
                // Public account follow (immediate)
                await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId }, $inc: { followingCount: 1 } });
                await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId }, $inc: { followersCount: 1 }, });
                const notification = await Notification.create({
                    recipient: targetUser._id,
                    sender: req.user._id,
                    type: "follow",
                });
                const recipientSocket = onlineUsers.get(targetUser._id.toString());
                if (recipientSocket) {
                    getIO().to(recipientSocket).emit("notification:new", {
                        notificationId: notification._id,
                        type: notification.type,
                    });
                }
                return res.json({
                    followed: true
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getFollowRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("followRequests", "name username avatar");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.followRequests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const acceptFollowRequest = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const requesterId = req.params.id;
        const user = await User.findById(currentUserId);
        
        if (!user.followRequests.some(id => id.toString() === requesterId)) {
            return res.status(400).json({ message: "No follow request from this user" });
        }

        await User.findByIdAndUpdate(currentUserId, { 
            $pull: { followRequests: requesterId },
            $addToSet: { followers: requesterId },
            $inc: { followersCount: 1 }
        });
        await User.findByIdAndUpdate(requesterId, {
            $addToSet: { following: currentUserId },
            $inc: { followingCount: 1 }
        });
        const notification = await Notification.create({
            recipient: requesterId,
            sender: currentUserId,
            type: "follow_request_accepted",
        });
        const recipientSocket = onlineUsers.get(requesterId.toString());
        if (recipientSocket) {
            getIO().to(recipientSocket).emit("notification:new", {
                notificationId: notification._id,
                type: notification.type,
            });
        }

        res.json({ success: true, message: "Follow request accepted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const rejectFollowRequest = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const requesterId = req.params.id;
        const user = await User.findById(currentUserId);

        if (!user.followRequests.some(id => id.toString() === requesterId)) {
            return res.status(400).json({ message: "No follow request from this user" });
        }

        await User.findByIdAndUpdate(currentUserId, { 
            $pull: { followRequests: requesterId }
        });

        res.json({ success: true, message: "Follow request rejected" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select("_id name surname username avatar bio description followersCount followingCount followers isPrivate").lean();
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        
        const response = { ...user };
        
        // Check if current user is following or has requested to follow this profile
        if (req.user) {
            const currentUserId = req.user._id.toString();
            response.isFollowedByCurrentUser = user.followers.some(follower => 
                follower.toString() === currentUserId
            );
            
            // Check for pending follow request
            // We need to fetch the user again with followRequests or use the lean object if it was included
            const fullUser = await User.findById(user._id).select("followRequests").lean();
            response.isRequestedByCurrentUser = fullUser.followRequests?.some(id => 
                id.toString() === currentUserId
            );
        }
        
        // Don't expose the followers array in the response
        delete response.followers;
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFollowers = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const isSelf = req.user.id === req.params.id;
        const isFollower = targetUser.followers.some(id => id.toString() === req.user.id);

        if (targetUser.isPrivate && !isSelf && !isFollower) {
            return res.status(403).json({ message: "This account is private. Follow to see their followers." });
        }

        const userWithFollowers = await User.findById(req.params.id).populate("followers", "name username avatar followers");
        res.status(200).json(userWithFollowers.followers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getFollowing = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const isSelf = req.user.id === req.params.id;
        const isFollower = targetUser.followers.some(id => id.toString() === req.user.id);

        if (targetUser.isPrivate && !isSelf && !isFollower) {
            return res.status(403).json({ message: "This account is private. Follow to see who they follow." });
        }

        const userWithFollowing = await User.findById(req.params.id).populate("following", "name username avatar followers");
        res.status(200).json(userWithFollowing.following);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const users = await User.find({ _id: { $ne: req.user.id } }).select("-password").limit(limit).skip(skip);
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
        return res.json({
            users: [],
            posts: []
        });
    }

    const users = await User.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { username: { $regex: query, $options: "i" } }
        ]
    })
    .select("-password")
    .limit(10);

    const posts = await Post.find({
        $or: [
            { content: { $regex: query, $options: "i" } },
            { intent: { $regex: query, $options: "i" } }
        ]
    })
    .populate("author", "username")
    .limit(10);

    res.json({
        users,
        posts
    });

} catch {
    res.status(500).json({
        message: "Search failed"
    });
}

};

