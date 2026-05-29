/**
 * Migration: Backfill Follow collection from legacy User social-graph arrays
 *
 * Run once before deploying the Follow-collection refactor to production:
 *   node scripts/migrate-follow-collection.js
 *
 * Safe to re-run: all inserts use updateOne with upsert:true, so existing
 * Follow documents are never duplicated. The script is idempotent.
 *
 * What it does:
 *   1. Reads every User document that still has a non-empty `followers`,
 *      `following`, or `followRequests` array (kept temporarily via a
 *      migration-only lean projection — these fields are gone from the schema
 *      but still present in MongoDB until explicitly dropped).
 *   2. Inserts a Follow document for every entry (status: "accepted" for
 *      followers/following, status: "pending" for followRequests).
 *   3. Reconciles followersCount / followingCount to match the real Follow
 *      collection count so the denormalised counters are correct.
 *   4. Reports a per-collection summary at the end.
 */

import "dotenv/config";
import mongoose from "mongoose";
import Follow from "../src/models/follow.model.js";
import User from "../src/models/user.model.js";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("MONGO_URI is not set in environment. Aborting.");
    process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("Connected to MongoDB:", MONGO_URI.replace(/\/\/.*@/, "//***@"));

let insertedFollowing = 0;
let insertedFollowers = 0;
let insertedRequests = 0;
let countFixed = 0;

// Use a raw collection query so we can read the old array fields even though
// they are no longer declared in the Mongoose schema.
const rawUsers = mongoose.connection.collection("users");

const cursor = rawUsers.find(
    {
        $or: [
            { followers: { $exists: true, $not: { $size: 0 } } },
            { following: { $exists: true, $not: { $size: 0 } } },
            { followRequests: { $exists: true, $not: { $size: 0 } } },
        ],
    },
    { projection: { _id: 1, followers: 1, following: 1, followRequests: 1 } }
);

for await (const doc of cursor) {
    const userId = doc._id;

    // ── following ──────────────────────────────────────────────────────────
    for (const followingId of doc.following || []) {
        const r = await Follow.updateOne(
            { follower: userId, following: followingId },
            { $setOnInsert: { follower: userId, following: followingId, status: "accepted" } },
            { upsert: true }
        );
        if (r.upsertedCount) insertedFollowing++;
    }

    // ── followers ──────────────────────────────────────────────────────────
    // These are the inverse edges — insert from the follower's perspective
    // so we don't double-insert what we already handled above.
    for (const followerId of doc.followers || []) {
        const r = await Follow.updateOne(
            { follower: followerId, following: userId },
            { $setOnInsert: { follower: followerId, following: userId, status: "accepted" } },
            { upsert: true }
        );
        if (r.upsertedCount) insertedFollowers++;
    }

    // ── followRequests (pending) ───────────────────────────────────────────
    for (const requesterId of doc.followRequests || []) {
        const r = await Follow.updateOne(
            { follower: requesterId, following: userId },
            { $setOnInsert: { follower: requesterId, following: userId, status: "pending" } },
            { upsert: true }
        );
        if (r.upsertedCount) insertedRequests++;
    }
}

// ── Reconcile denormalised counters ────────────────────────────────────────
// Re-calculate followersCount / followingCount from the Follow collection for
// every user so they are accurate even if the old arrays were inconsistent.
console.log("\nReconciling followersCount / followingCount …");

const allUsers = await User.find({}).select("_id").lean();

for (const { _id } of allUsers) {
    const [followersCount, followingCount] = await Promise.all([
        Follow.countDocuments({ following: _id, status: "accepted" }),
        Follow.countDocuments({ follower: _id, status: "accepted" }),
    ]);

    const result = await User.updateOne(
        { _id, $or: [{ followersCount: { $ne: followersCount } }, { followingCount: { $ne: followingCount } }] },
        { $set: { followersCount, followingCount } }
    );
    if (result.modifiedCount) countFixed++;
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log("\n=== Migration complete ===");
console.log(`  Follow docs inserted (following edges):  ${insertedFollowing}`);
console.log(`  Follow docs inserted (follower edges):   ${insertedFollowers}`);
console.log(`  Follow docs inserted (pending requests): ${insertedRequests}`);
console.log(`  User counter fields reconciled:          ${countFixed}`);
console.log("\nYou may now drop the legacy array fields from MongoDB:");
console.log('  db.users.updateMany({}, { $unset: { followers: "", following: "", followRequests: "" } })');

await mongoose.disconnect();
