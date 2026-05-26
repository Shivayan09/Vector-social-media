import User from "../models/user.model.js";

/**
 * buildPostVisibilityFilter
 *
 * Constructs a MongoDB filter object that excludes posts from:
 *   1. Users who have blocked the current user
 *   2. Users the current user has blocked
 *   3. Private accounts the current user does not follow (and is not self)
 *
 * This logic was previously duplicated identically across three controllers:
 *   - getPosts
 *   - getTopPostsOfWeek
 *   - getTopPostsOfMonth
 *
 * Centralising it here ensures any future changes to visibility rules
 * only need to be made in one place.
 *
 * @param {object|null} currentUser - The authenticated user object from req.user, or null for anonymous requests.
 * @param {object} [baseFilter={}] - An existing MongoDB filter to merge the visibility constraints into.
 * @returns {Promise<object>} A MongoDB filter object safe to pass to Post.find() or Post.aggregate()
 */
export const buildPostVisibilityFilter = async (currentUser, baseFilter = {}) => {
    if (currentUser) {
        const currentUserId = currentUser._id || currentUser.id;
        const blockers = await User.find({ blockedUsers: currentUserId }).select("_id");
        const blockerIds = blockers.map(u => u._id);
        const blockedIds = currentUser.blockedUsers || [];
        let excludeUserIds = [...blockedIds, ...blockerIds];

        const privateUsers = await User.find({
            _id: { $nin: [...(currentUser.following || []), currentUserId] },
            isPrivate: true,
        }).select("_id");
        const privateUserIds = privateUsers.map(u => u._id);
        excludeUserIds = [...excludeUserIds, ...privateUserIds];

        if (excludeUserIds.length > 0) {
            return { ...baseFilter, author: { $nin: excludeUserIds } };
        }
    } else {
        // Anonymous request — only hide private accounts
        const privateUsers = await User.find({ isPrivate: true }).select("_id");
        const privateUserIds = privateUsers.map(u => u._id);
        if (privateUserIds.length > 0) {
            return { ...baseFilter, author: { $nin: privateUserIds } };
        }
    }

    return { ...baseFilter };
};
