import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { getIO } from "../socket/socket.js";
import { uploadToCloudinary } from "../utils/uploadCleanup.js";
import { validateImageBuffer } from "../utils/validateFileType.js";
import { cleanupTempUpload, IMAGE_UPLOAD_LIMITS, validateImageUpload } from "../utils/imageUploadValidation.js";

export const uploadAvatar = async (req, res) => {
    let avatarPublicId = null;
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        const { valid, detectedType } = await validateImageBuffer(req.file.buffer);
        if (!valid) {
            return res.status(415).json({
                success: false,
                message: `Unsupported file type${detectedType ? `: ${detectedType}` : ""}. Only JPEG, PNG, and WebP images are accepted.`,
            });
        }
        await validateImageUpload(req.file, {
            allowedFormats: ["jpeg", "png", "webp"],
            maxSize: IMAGE_UPLOAD_LIMITS.avatar,
            label: "Avatar",
        });

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const uploadResult = await uploadToCloudinary(req.file, {
            folder: "avatars",
            transformation: [
                { width: 300, height: 300, crop: "fill" },
                { quality: "auto" },
            ],
        });
        avatarPublicId = uploadResult.public_id;
        if (user.avatarPublicId) {
            await cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
        }
        user.avatar = uploadResult.secure_url;
        user.avatarPublicId = uploadResult.public_id;
        await user.save();
        return res.status(200).json({
            success: true,
            avatar: user.avatar,
        });
    } catch (error) {
        await cleanupTempUpload(req.file);
        if (avatarPublicId) {
            await cloudinary.uploader.destroy(avatarPublicId).catch(() => {});
        }
        return res.status(error.statusCode || 500).json({
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
            const trimmedUsername = username.trim();
            if (trimmedUsername === "") {
                return res.status(400).json({
                    success: false,
                    message: "Username cannot be empty"
                });
            }
            if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be between 3 and 30 characters"
                });
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
                return res.status(400).json({
                    success: false,
                    message: "Username can only contain letters, numbers, underscores, and hyphens"
                });
            }
            const existingUser = await User.findOne({ username: trimmedUsername, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Username is already taken"
                });
            }
            user.username = trimmedUsername;
        }
        if (name !== undefined) {
            if (name.trim().length < 2 || name.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Name must be between 2 and 100 characters"
                });
            }
            user.name = name;
        }
        if (surname !== undefined) {
            if (surname.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Surname must not exceed 100 characters"
                });
            }
            user.surname = surname;
        }
        if (phoneNumber !== undefined) {
            const trimmedPhone = phoneNumber.trim();
            if (trimmedPhone.length > 20) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number must not exceed 20 characters"
                });
            }
            if (trimmedPhone !== "" && !/^[+\d][\d\s\-()]*$/.test(trimmedPhone)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid phone number format"
                });
            }
            user.phoneNumber = trimmedPhone;
        }
        if (bio !== undefined) {
            if (bio.length > 30) {
                return res.status(400).json({
                    success: false,
                    message: "Bio must not exceed 30 characters"
                });
            }
            user.bio = bio;
        }
        if (description !== undefined) {
            if (description.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Description must not exceed 200 characters"
                });
            }
            user.description = description;
        }
        if (isPrivate !== undefined) {
            if (typeof isPrivate !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "isPrivate must be a boolean"
                });
            }
            if (isPrivate === false && user.isPrivate === true) {
                await Follow.deleteMany({ following: userId, status: "pending" });
            }
            if (user.isPrivate !== isPrivate) {
                user.isPrivate = isPrivate;
                await Post.updateMany({ author: userId }, { authorIsPrivate: isPrivate });
            }
        }
        await user.save();
        const followRequests = await Follow.find({ following: userId, status: "pending" }).select("follower").lean();
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
                followRequests: followRequests.map(f => f.follower.toString()),
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
        if (!currentUser) return res.status(404).json({ message: "Current user not found" });
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        const isBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUserId) ||
            targetUser.blockedUsers?.some(id => id.toString() === currentUserId);
        if (isBlocked) {
            return res.status(403).json({ message: "Cannot perform action due to block status" });
        }

        const existingFollow = await Follow.findOne({ follower: currentUserId, following: targetUserId });

        if (existingFollow && existingFollow.status === "accepted") {
            // Unfollow: atomically delete the accepted Follow doc and decrement counts
            const deleted = await Follow.findOneAndDelete({ follower: currentUserId, following: targetUserId, status: "accepted" });
            if (deleted) {
                await User.updateOne({ _id: currentUserId }, { $inc: { followingCount: -1 } });
                await User.updateOne({ _id: targetUserId }, { $inc: { followersCount: -1 } });
            }
            return res.json({ followed: false });
        } else if (existingFollow && existingFollow.status === "pending") {
            // Cancel follow request: atomically delete the pending Follow doc
            const deleted = await Follow.findOneAndDelete({ follower: currentUserId, following: targetUserId, status: "pending" });
            if (deleted) {
                await Notification.deleteOne({ recipient: targetUserId, sender: currentUserId, type: "follow_request" });
            }
            return res.json({ requested: false, message: "Follow request cancelled" });
        } else {
            // New follow: use upsert so concurrent requests collapse on the unique index
            // rather than racing to insert and surfacing a duplicate-key 500.
            if (targetUser.isPrivate) {
                const result = await Follow.findOneAndUpdate(
                    { follower: currentUserId, following: targetUserId },
                    { $setOnInsert: { follower: currentUserId, following: targetUserId, status: "pending" } },
                    { upsert: true, returnDocument: 'after', includeResultMetadata: true }
                );
                // Only send notification if we actually created a new document
                if (result.lastErrorObject?.upserted) {
                    const notification = await Notification.create({
                        recipient: targetUser._id,
                        sender: req.user._id,
                        type: "follow_request",
                    });
                    getIO().to(targetUser._id.toString()).emit("notification:new", {
                        notificationId: notification._id,
                        type: notification.type,
                    });
                }
                return res.json({ requested: true, message: "Follow request sent" });
            } else {
                // Public account — immediate follow
                const result = await Follow.findOneAndUpdate(
                    { follower: currentUserId, following: targetUserId },
                    { $setOnInsert: { follower: currentUserId, following: targetUserId, status: "accepted" } },
                    { upsert: true, returnDocument: 'after', includeResultMetadata: true }
                );
                if (result.lastErrorObject?.upserted) {
                    await User.updateOne({ _id: currentUserId }, { $inc: { followingCount: 1 } });
                    await User.updateOne({ _id: targetUserId }, { $inc: { followersCount: 1 } });
                    const notification = await Notification.create({
                        recipient: targetUser._id,
                        sender: req.user._id,
                        type: "follow",
                    });
                    getIO().to(targetUser._id.toString()).emit("notification:new", {
                        notificationId: notification._id,
                        type: notification.type,
                    });
                }
                return res.json({ followed: true });
            }
        }
    } catch (error) {
        // E11000: concurrent request already inserted the same Follow doc — not an error for the client
        if (error.code === 11000) {
            return res.json({ followed: true });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getFollowRequests = async (req, res) => {
    try {
        const requests = await Follow.find({ following: req.user.id, status: "pending" })
            .populate("follower", "name username avatar");
        res.status(200).json(requests.map(r => r.follower));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getSentFollowRequests = async (req, res) => {
    try {
        const requests = await Follow.find({ follower: req.user.id, status: "pending" })
            .populate("following", "name username avatar bio");
        res.status(200).json(requests.map(r => r.following));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const acceptFollowRequest = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const currentUserId = req.user.id;
        const requesterId = req.params.id;

        let acceptedFollow = null;
        let notification = null;

        const performAccept = async (opts = {}) => {
            const [user, requesterDoc] = await Promise.all([
                User.findById(currentUserId).select("blockedUsers"),
                User.findById(requesterId).select("blockedUsers"),
            ]);

            if (!user) {
                const err = new Error("User not found");
                err.statusCode = 404;
                throw err;
            }

            if (!requesterDoc) {
                const err = new Error("Requester not found");
                err.statusCode = 404;
                throw err;
            }

            // Check bidirectional block status before accepting
            if (user.blockedUsers?.some((id) => id.toString() === requesterId)) {
                const err = new Error("You have blocked this user");
                err.statusCode = 403;
                throw err;
            }

            if (requesterDoc.blockedUsers?.some((id) => id.toString() === currentUserId)) {
                const err = new Error("This user has blocked you");
                err.statusCode = 403;
                throw err;
            }

            // Atomic state transition: only one concurrent accept should succeed.
            acceptedFollow = await Follow.findOneAndUpdate(
                { follower: requesterId, following: currentUserId, status: "pending" },
                { $set: { status: "accepted" } },
                { new: true, ...opts }
            );

            if (!acceptedFollow) return;

            await Promise.all([
                User.updateOne({ _id: currentUserId }, { $inc: { followersCount: 1 } }, opts),
                User.updateOne({ _id: requesterId }, { $inc: { followingCount: 1 } }, opts),
            ]);

            const existing = await Notification.findOneAndUpdate(
                { recipient: requesterId, sender: currentUserId, type: "follow_request_accepted" },
                { $setOnInsert: { recipient: requesterId, sender: currentUserId, type: "follow_request_accepted" } },
                { upsert: true, returnDocument: "before", ...opts }
            );

            if (!existing) {
                notification = await Notification.findOne({
                    recipient: requesterId,
                    sender: currentUserId,
                    type: "follow_request_accepted",
                });
            }
        };

        try {
            await session.withTransaction(async () => {
                await performAccept({ session });
            });
        } catch (error) {
            // mongodb-memory-server (and some standalone Mongo deployments) do not support transactions.
            // Fall back to non-transactional atomic update + idempotent notification.
            const message = String(error?.message || "");
            const txNotSupported =
                message.includes("Transaction numbers are only allowed") ||
                message.includes("transactions are not supported");

            if (!txNotSupported) throw error;

            await performAccept();
        }

        if (!acceptedFollow) {
            return res.status(400).json({ message: "No follow request from this user" });
        }

        if (notification) {
            getIO().to(requesterId.toString()).emit("notification:new", {
                notificationId: notification._id,
                type: notification.type,
            });
        }

        return res.json({ success: true, message: "Follow request accepted" });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ message: err.message });
    } finally {
        session.endSession();
    }
};

export const rejectFollowRequest = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const requesterId = req.params.id;

        const followRequest = await Follow.findOne({ follower: requesterId, following: currentUserId, status: "pending" });
        if (!followRequest) {
            return res.status(400).json({ message: "No follow request from this user" });
        }

        await Follow.deleteOne({ _id: followRequest._id });
        await Notification.deleteOne({ recipient: currentUserId, sender: requesterId, type: "follow_request" });

        res.json({ success: true, message: "Follow request rejected" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;

        // Single query
        const user = await User.findOne({ username })
            .select("_id name surname username avatar bio description followersCount followingCount isPrivate blockedUsers createdAt")
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const response = { ...user };

        if (req.user) {
            const currentUserId = req.user._id.toString();

            // If target user has blocked current user, return redacted profile
            const isBlockedByTarget = user.blockedUsers?.some(id => id.toString() === currentUserId);
            if (isBlockedByTarget) {
                return res.status(200).json({
                    _id: user._id,
                    username: "User",
                    name: "Vector User",
                    surname: "",
                    avatar: "",
                    bio: "",
                    description: "",
                    followersCount: 0,
                    followingCount: 0,
                    isPrivate: true,
                    isBlockedByTarget: true,
                    isBlockedByCurrentUser: false
                });
            }

            // If current user has blocked target user
            const currentUser = await User.findById(currentUserId).select("blockedUsers").lean();
            const isBlockedByMe = currentUser?.blockedUsers?.some(id => id.toString() === user._id.toString());
            response.isBlockedByCurrentUser = !!isBlockedByMe;

            // Is the current user already following this profile?
            const followAccepted = await Follow.exists({ follower: currentUserId, following: user._id, status: "accepted" });
            response.isFollowedByCurrentUser = !!followAccepted;

            // Has the current user sent a pending follow request?
            const followPending = await Follow.exists({ follower: currentUserId, following: user._id, status: "pending" });
            response.isRequestedByCurrentUser = !!followPending;

            // Compute mutual followers only when viewing someone else's profile
            if (currentUserId !== user._id.toString()) {
                const currentUserFollowings = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
                const currentUserFollowingIds = currentUserFollowings.map(f => f.following);

                const mutualFollowersCursor = await Follow.find({ following: user._id, status: "accepted", follower: { $in: currentUserFollowingIds } }).select("follower").lean();
                const mutualFollowerIds = mutualFollowersCursor.map(f => f.follower);

                // Populate the top 3 mutual followers for the UI avatar stack
                const mutualFollowers = await User.find({ _id: { $in: mutualFollowerIds } })
                    .select("name username avatar")
                    .limit(3)
                    .lean();

                response.mutualFollowers = mutualFollowers;
                response.mutualFollowersCount = mutualFollowerIds.length;
            }
        }

        // Anonymous request on a private account — return only minimum public fields
        if (!req.user && user.isPrivate) {
            return res.status(200).json({
                _id: user._id,
                username: user.username,
                name: user.name,
                avatar: user.avatar,
                isPrivate: true,
            });
        }

        // Strip internal arrays — never expose raw follower/request or block IDs to the client
        delete response.blockedUsers;

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFollowers = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id).select("isPrivate blockedUsers");
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const requesterId = req.user.id;

        // Enforce block restrictions consistently with getUserProfile.
        // A blocked user must not be able to enumerate the target's social graph.
        const isBlockedByTarget = targetUser.blockedUsers?.some(
            (id) => id.toString() === requesterId
        );
        if (isBlockedByTarget) {
            return res.status(403).json({ message: "You are not allowed to view this profile." });
        }

        const requester = await User.findById(requesterId).select("blockedUsers").lean();
        const hasBlockedTarget = requester?.blockedUsers?.some(
            (id) => id.toString() === req.params.id
        );
        if (hasBlockedTarget) {
            return res.status(403).json({ message: "You are not allowed to view this profile." });
        }

        const isSelf = requesterId === req.params.id;
        const isFollower = await Follow.exists({ follower: requesterId, following: req.params.id, status: "accepted" });

        if (targetUser.isPrivate && !isSelf && !isFollower) {
            return res.status(403).json({ message: "This account is private. Follow to see their followers." });
        }

        const cursor = req.query.cursor || null;
        const limit = parseInt(req.query.limit) || 20;

        let filter = { following: req.params.id, status: "accepted" };
        if (cursor) {
            if (mongoose.Types.ObjectId.isValid(cursor)) {
                filter._id = { $lt: cursor };
            } else {
                return res.status(400).json({ success: false, message: "Invalid cursor format" });
            }
        }

        const followersList = await Follow.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("follower", "name username avatar");

        const hasMore = followersList.length === limit;
        const nextCursor = hasMore ? followersList[followersList.length - 1]._id : null;

        res.status(200).json({
            followers: followersList.map(f => f.follower),
            nextCursor,
            hasMore
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getFollowing = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id).select("isPrivate blockedUsers");
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const requesterId = req.user.id;

        // Enforce block restrictions consistently with getUserProfile.
        // A blocked user must not be able to enumerate the target's social graph.
        const isBlockedByTarget = targetUser.blockedUsers?.some(
            (id) => id.toString() === requesterId
        );
        if (isBlockedByTarget) {
            return res.status(403).json({ message: "You are not allowed to view this profile." });
        }

        const requester = await User.findById(requesterId).select("blockedUsers").lean();
        const hasBlockedTarget = requester?.blockedUsers?.some(
            (id) => id.toString() === req.params.id
        );
        if (hasBlockedTarget) {
            return res.status(403).json({ message: "You are not allowed to view this profile." });
        }

        const isSelf = requesterId === req.params.id;
        const isFollower = await Follow.exists({ follower: requesterId, following: req.params.id, status: "accepted" });

        if (targetUser.isPrivate && !isSelf && !isFollower) {
            return res.status(403).json({ message: "This account is private. Follow to see who they follow." });
        }

        const cursor = req.query.cursor || null;
        const limit = parseInt(req.query.limit) || 20;

        let filter = { follower: req.params.id, status: "accepted" };
        if (cursor) {
            if (mongoose.Types.ObjectId.isValid(cursor)) {
                filter._id = { $lt: cursor };
            } else {
                return res.status(400).json({ success: false, message: "Invalid cursor format" });
            }
        }

        const followingList = await Follow.find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .populate("following", "name username avatar");

        const hasMore = followingList.length === limit;
        const nextCursor = hasMore ? followingList[followingList.length - 1]._id : null;

        res.status(200).json({
            following: followingList.map(f => f.following),
            nextCursor,
            hasMore
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const currentUserId = req.user._id || req.user.id;
        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = req.user.blockedUsers || [];
        const excludeIds = [...blockedIds, ...blockerIds, currentUserId];

        const page = Number(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const users = await User.find({ _id: { $nin: excludeIds } }).select("name username avatar bio description").limit(limit).skip(skip);
        res.status(200).json({
            success: true,
            users
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id || req.user.id;
        
        const followings = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
        const followingIds = followings.map(f => f.following);

        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = req.user.blockedUsers || [];
        const excludeIds = [...blockedIds, ...blockerIds, currentUserId, ...followingIds];

        const suggestedUsers = await User.find({
            _id: { $nin: excludeIds }
        }).select("name username bio avatar").limit(10).lean();

        const suggestedUserIds = suggestedUsers.map((user) => user._id);
        const requestedUsers = await Follow.find({
            following: { $in: suggestedUserIds },
            follower: currentUserId,
            status: "pending"
        }).select("following").lean();

        const requestedUserIds = new Set(
            requestedUsers.map((user) => user.following.toString())
        );
        const followingUserSet = new Set(
            followingIds.map((id) => id.toString())
        );

        const users = suggestedUsers.map((user) => ({
            ...user,
            isFollowedByCurrentUser: followingUserSet.has(user._id.toString()),
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
        const postExcludeIds = [...blockedIds, ...blockerIds];

        const users = await User.find({
            $and: [
                { $text: { $search: query } },
                { _id: { $nin: excludeIds } }
            ]
        })
            .select("name username avatar")
            .limit(10)
            .lean();

        const followings = await Follow.find({ follower: currentUserId, status: "accepted" }).select("following").lean();
        const followingUserIds = new Set(followings.map(f => f.following.toString()));

        const visibleAuthorIds = new Set([
            ...followingUserIds,
            currentUserId.toString(),
        ]);

        const searchedUserIds = users.map((user) => user._id);
        const requestedUsers = await Follow.find({
            following: { $in: searchedUserIds },
            follower: currentUserId,
            status: "pending"
        }).select("following").lean();

        const requestedUserIds = new Set(
            requestedUsers.map((user) => user.following.toString())
        );

        const usersWithFollowState = users.map((user) => ({
            ...user,
            isFollowedByCurrentUser: followingUserIds.has(user._id.toString()),
            isRequestedByCurrentUser: requestedUserIds.has(user._id.toString()),
        }));

        const privateNotVisibleUsers = await User.find({
            _id: { $nin: Array.from(visibleAuthorIds) },
            isPrivate: true,
        })
            .select("_id")
            .lean();

        const privateNotVisibleIds = privateNotVisibleUsers.map((user) => user._id);

        const posts = await Post.find({
            $and: [
                { $text: { $search: query } },
                { author: { $nin: postExcludeIds } },
                { author: { $nin: privateNotVisibleIds } }
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
    const currentUserId = req.user.id;
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
        return res.status(400).json({ message: "You cannot block yourself" });
    }

    // All writes run inside a single MongoDB transaction so a partial failure
    // cannot leave the database in an inconsistent state (e.g. block recorded
    // but follow relationships not cleaned up, or counts drifting out of sync).
    const session = await mongoose.startSession();

    // Variables populated inside the transaction and needed after commit for
    // socket events (socket.io must not be called while the transaction is open).
    let targetUserPostIds = [];
    let currentUserPostIds = [];
    let blockedOnCurrentCounts = [];
    let blockerOnTargetCounts = [];
    let alreadyBlocked = false;

    try {
        await session.withTransaction(async () => {
            const currentUser = await User.findById(currentUserId).session(session);
            const targetUser = await User.findById(targetUserId).session(session);

            if (!currentUser || !targetUser) {
                const err = new Error("User not found");
                err.status = 404;
                throw err;
            }

            alreadyBlocked = currentUser.blockedUsers?.some(
                (id) => id.toString() === targetUserId
            );
            if (alreadyBlocked) return;

            // Record the block atomically — $addToSet is idempotent
            await User.updateOne(
                { _id: currentUserId },
                { $addToSet: { blockedUsers: targetUserId } },
                { session }
            );

            // Count active follow relationships before deleting them so follower
            // and following counts can be decremented accurately
            const [fwd, rev] = await Promise.all([
                Follow.findOne(
                    { follower: currentUserId, following: targetUserId, status: "accepted" },
                    null,
                    { session }
                ),
                Follow.findOne(
                    { follower: targetUserId, following: currentUserId, status: "accepted" },
                    null,
                    { session }
                ),
            ]);

            if (fwd) {
                await Promise.all([
                    User.updateOne({ _id: currentUserId }, { $inc: { followingCount: -1 } }, { session }),
                    User.updateOne({ _id: targetUserId }, { $inc: { followersCount: -1 } }, { session }),
                ]);
            }
            if (rev) {
                await Promise.all([
                    User.updateOne({ _id: targetUserId }, { $inc: { followingCount: -1 } }, { session }),
                    User.updateOne({ _id: currentUserId }, { $inc: { followersCount: -1 } }, { session }),
                ]);
            }

            await Follow.deleteMany(
                {
                    $or: [
                        { follower: currentUserId, following: targetUserId },
                        { follower: targetUserId, following: currentUserId },
                    ],
                },
                { session }
            );

            // Remove notifications between the two users
            await Notification.deleteMany(
                {
                    $or: [
                        { recipient: currentUserId, sender: targetUserId },
                        { recipient: targetUserId, sender: currentUserId },
                    ],
                },
                { session }
            );

            // Delete shared conversations and their messages
            const conversations = await Conversation.find(
                { participants: { $all: [currentUserId, targetUserId] } },
                null,
                { session }
            );
            const conversationIds = conversations.map((c) => c._id);
            if (conversationIds.length > 0) {
                await Message.deleteMany({ conversation: { $in: conversationIds } }, { session });
                await Conversation.deleteMany({ _id: { $in: conversationIds } }, { session });
            }

            // Gather post IDs for like/bookmark/comment cleanup
            const [cPosts, tPosts] = await Promise.all([
                Post.find({ author: currentUserId }, "_id", { session }).lean(),
                Post.find({ author: targetUserId }, "_id", { session }).lean(),
            ]);
            currentUserPostIds = cPosts.map((p) => p._id);
            targetUserPostIds = tPosts.map((p) => p._id);

            // Remove mutual likes
            await Promise.all([
                Post.updateMany(
                    { author: currentUserId },
                    { $pull: { likes: targetUserId } },
                    { session }
                ),
                Post.updateMany(
                    { author: targetUserId },
                    { $pull: { likes: currentUserId } },
                    { session }
                ),
            ]);

            // Count and remove mutual comments to keep commentsCount accurate
            [blockedOnCurrentCounts, blockerOnTargetCounts] = await Promise.all([
                Comment.aggregate([
                    { $match: { post: { $in: currentUserPostIds }, author: targetUser._id } },
                    { $group: { _id: "$post", count: { $sum: 1 } } },
                ]).session(session),
                Comment.aggregate([
                    { $match: { post: { $in: targetUserPostIds }, author: currentUser._id } },
                    { $group: { _id: "$post", count: { $sum: 1 } } },
                ]).session(session),
            ]);

            await Promise.all([
                Comment.deleteMany(
                    { post: { $in: currentUserPostIds }, author: targetUser._id },
                    { session }
                ),
                Comment.deleteMany(
                    { post: { $in: targetUserPostIds }, author: currentUser._id },
                    { session }
                ),
            ]);

            const commentCountUpdates = [
                ...blockedOnCurrentCounts.map(({ _id, count }) => ({
                    updateOne: { filter: { _id }, update: { $inc: { commentsCount: -count } } },
                })),
                ...blockerOnTargetCounts.map(({ _id, count }) => ({
                    updateOne: { filter: { _id }, update: { $inc: { commentsCount: -count } } },
                })),
            ];
            if (commentCountUpdates.length) {
                await Post.bulkWrite(commentCountUpdates, { session, ordered: false });
            }

            // Remove cross-bookmarks
            await Promise.all([
                User.updateOne(
                    { _id: currentUserId },
                    { $pull: { bookmarks: { $in: targetUserPostIds } } },
                    { session }
                ),
                User.updateOne(
                    { _id: targetUserId },
                    { $pull: { bookmarks: { $in: currentUserPostIds } } },
                    { session }
                ),
            ]);
        });

        if (alreadyBlocked) {
            return res.status(400).json({ message: "User is already blocked" });
        }

        // Emit socket events only after the transaction has committed
        const io = getIO();
        io.to(currentUserId).emit("user:blocked", { blockedUserId: targetUserId, blockerId: currentUserId });
        io.to(targetUserId).emit("user:blocked", { blockedUserId: currentUserId, blockerId: currentUserId });
        io.to(currentUserId).emit("bookmarks:invalidated", { userId: targetUserId });
        io.to(targetUserId).emit("bookmarks:invalidated", { userId: currentUserId });
        io.to(currentUserId).emit("block:likes_cleaned", { targetUserId, postIds: targetUserPostIds.map(String) });
        io.to(targetUserId).emit("block:likes_cleaned", { targetUserId: currentUserId, postIds: currentUserPostIds.map(String) });
        io.to(currentUserId).emit("block:comments_cleaned", {
            targetUserId,
            commentRemovals: blockedOnCurrentCounts.map(({ _id, count }) => ({
                postId: _id.toString(),
                count,
            })),
        });
        io.to(targetUserId).emit("block:comments_cleaned", {
            targetUserId: currentUserId,
            commentRemovals: blockerOnTargetCounts.map(({ _id, count }) => ({
                postId: _id.toString(),
                count,
            })),
        });

        return res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
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

        // No Follow-collection cleanup needed here: blockUser already deleted all Follow
        // documents between the two users at block-time. There is nothing to unwind.

        const io = getIO();
        io.to(currentUserId).emit("user:unblocked", { unblockedUserId: targetUserId, blockerId: currentUserId });
        io.to(targetUserId).emit("user:unblocked", { unblockedUserId: currentUserId, blockerId: currentUserId });

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

