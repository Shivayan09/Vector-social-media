import Conversation from "../models/conversation.model.js";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

export async function cleanupSoftDeletedConversations() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const result = await Conversation.deleteMany({
        $expr: { $eq: [{ $size: "$deletedBy" }, { $size: "$participants" }] },
        updatedAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} fully soft-deleted conversations older than ${RETENTION_DAYS} days`);
    }
}

export function startCleanupJob() {
    cleanupSoftDeletedConversations();
    setInterval(cleanupSoftDeletedConversations, CLEANUP_INTERVAL_MS);
}
