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

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Only JPEG, PNG and WEBP images are allowed",
            });
        }

        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "File size must be under 5MB",
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
        const isBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUserId) ||
                          targetUser.blockedUsers?.some(id => id.toString() === currentUserId);
        if (isBlocked) {
            return res.status(403).json({
                message: "Cannot perform action due to block status"
            });
        }
        const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);
        if (isFollowing) {
            // Unfollow logic
            const result = await User.updateOne(
                { _id: currentUserId, following: targetUserId },
                { $pull: { following: targetUserId }, $inc: { followingCount: -1 } }
            );
            if (result.modifiedCount > 0) {
                await User.updateOne(
                    { _id: targetUserId, followers: currentUserId },
                    { $pull: { followers: currentUserId }, $inc: { followersCount: -1 } }
                );
            }
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
                    const result = await User.updateOne(
                        { _id: targetUserId, followRequests: { $ne: currentUserId }, followers: { $ne: currentUserId } },
                        { $addToSet: { followRequests: currentUserId } }
                    );

                    if (result.modifiedCount > 0) {
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
                    }
                    return res.json({
                        requested: true,
                        message: "Follow request sent"
                    });
                }
            } else {
                // Public account follow (immediate)
                const result = await User.updateOne(
                    { _id: currentUserId, following: { $ne: targetUserId } },
                    { $addToSet: { following: targetUserId }, $inc: { followingCount: 1 } }
                );

                if (result.modifiedCount > 0) {
                    await User.updateOne(
                        { _id: targetUserId, followers: { $ne: currentUserId } },
                        { $addToSet: { followers: currentUserId }, $inc: { followersCount: 1 } }
                    );
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

        const result = await User.updateOne(
            { _id: currentUserId, followRequests: requesterId, followers: { $ne: requesterId } },
            { 
                $pull: { followRequests: requesterId },
                $addToSet: { followers: requesterId },
                $inc: { followersCount: 1 }
            }
        );

        if (result.modifiedCount > 0) {
            await User.updateOne(
                { _id: requesterId, following: { $ne: currentUserId } },
                {
                    $addToSet: { following: currentUserId },
                    $inc: { followingCount: 1 }
                }
            );
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
        const user = await User.findOne({ username }).select("_id name surname username avatar bio description followersCount followingCount followers isPrivate blockedUsers").lean();
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        
        const response = { ...user };
        
        // Check if current user is following or has requested to follow this profile
        if (req.user) {
            const currentUserId = req.user._id.toString();
            
            // If target user has blocked current user, return 404
            const isBlockedByTarget = user.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlockedByTarget) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            // If current user has blocked target user
            const currentUser = await User.findById(currentUserId).select("blockedUsers").lean();
            const isBlockedByMe = currentUser?.blockedUsers?.some(id => id.toString() === user._id.toString());
            response.isBlockedByCurrentUser = !!isBlockedByMe;

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
        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = req.user.blockedUsers || [];
        const excludeIds = [...blockedIds, ...blockerIds, currentUserId];

        const suggestedUsers = await User.find({
            $and: [
                { _id: { $nin: excludeIds } },
                { _id: { $nin: following } }
            ]
        }).select("name username bio avatar").limit(10).lean();

        const suggestedUserIds = suggestedUsers.map((user) => user._id);
        const requestedUsers = await User.find({
            _id: { $in: suggestedUserIds },
            followRequests: currentUserId,
        }).select("_id").lean();

        const requestedUserIds = new Set(
            requestedUsers.map((user) => user._id.toString())
        );
        const followingUserIds = new Set(
            following.map((id) => id.toString())
        );

        const users = suggestedUsers.map((user) => ({
            ...user,
            isFollowedByCurrentUser: followingUserIds.has(user._id.toString()),
            isRequestedByCurrentUser: requestedUserIds.has(user._id.toString()),
        }));

        res.status(200).json({
            success: true,
            users
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

    const currentUserId = req.user._id || req.user.id;
    const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
    const blockerIds = blockers.map(u => u._id);
    const blockedIds = req.user.blockedUsers || [];
    const excludeIds = [...blockedIds, ...blockerIds, currentUserId];

    const users = await User.find({
        $and: [
            {
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { username: { $regex: query, $options: "i" } }
                ]
            },
            { _id: { $nin: excludeIds } }
        ]
    })
    .select("name username avatar")
    .limit(10)
    .lean();

    const followingUserIds = new Set(
        (req.user.following || []).map((id) => id.toString())
    );
    const searchedUserIds = users.map((user) => user._id);
    const requestedUsers = await User.find({
        _id: { $in: searchedUserIds },
        followRequests: currentUserId,
    }).select("_id").lean();

    const requestedUserIds = new Set(
        requestedUsers.map((user) => user._id.toString())
    );

    const usersWithFollowState = users.map((user) => ({
        ...user,
        isFollowedByCurrentUser: followingUserIds.has(user._id.toString()),
        isRequestedByCurrentUser: requestedUserIds.has(user._id.toString()),
    }));

    const posts = await Post.find({
        $and: [
            {
                $or: [
                    { content: { $regex: query, $options: "i" } },
                    { intent: { $regex: query, $options: "i" } }
                ]
            },
            { author: { $nin: excludeIds } }
        ]
    })
    .populate("author", "username")
    .limit(10);

    res.json({
        users: usersWithFollowState,
        posts
    });

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
            return res.status(400).json({
                message: "You cannot block yourself"
            });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isAlreadyBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUserId);
        if (isAlreadyBlocked) {
            return res.status(400).json({
                message: "User is already blocked"
            });
        }

        // Add to blockedUsers list
        await User.updateOne(
            { _id: currentUserId },
            { $addToSet: { blockedUsers: targetUserId } }
        );

        // Remove follow relationships
        const wasFollowingTarget = currentUser.following.some(id => id.toString() === targetUserId);
        const wasFollowedByTarget = currentUser.followers.some(id => id.toString() === targetUserId);

        if (wasFollowingTarget) {
            await User.updateOne(
                { _id: currentUserId },
                { $pull: { following: targetUserId }, $inc: { followingCount: -1 } }
            );
            await User.updateOne(
                { _id: targetUserId },
                { $pull: { followers: currentUserId }, $inc: { followersCount: -1 } }
            );
        }

        if (wasFollowedByTarget) {
            await User.updateOne(
                { _id: currentUserId },
                { $pull: { followers: targetUserId }, $inc: { followersCount: -1 } }
            );
            await User.updateOne(
                { _id: targetUserId },
                { $pull: { following: currentUserId }, $inc: { followingCount: -1 } }
            );
        }

        // Remove follow requests in both directions
        await User.updateOne(
            { _id: currentUserId },
            { $pull: { followRequests: targetUserId } }
        );
        await User.updateOne(
            { _id: targetUserId },
            { $pull: { followRequests: currentUserId } }
        );

        // Remove any active notifications related to these two
        await Notification.deleteMany({
            $or: [
                { recipient: currentUserId, sender: targetUserId },
                { recipient: targetUserId, sender: currentUserId }
            ]
        });

        return res.json({
            success: true,
            message: "User blocked successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUserId);
        if (!isBlocked) {
            return res.status(400).json({
                message: "User is not blocked"
            });
        }

        await User.updateOne(
            { _id: currentUserId },
            { $pull: { blockedUsers: targetUserId } }
        );

        return res.json({
            success: true,
            message: "User unblocked successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

