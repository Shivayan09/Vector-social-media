import { Post } from "./types";

const GRAVITY = 1.5;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

function calculateTrendingScore(post: Post, now: number): number {
    const likes = post.likes?.length || 0;
    const comments = post.commentsCount || 0;
    const shares = post.sharesCount || 0;

    const engagement = likes + (comments * 2) + (shares * 3);
    
    // If no engagement, score is 0
    if (engagement === 0) return 0;

    const postDate = new Date(post.createdAt).getTime();
    const ageInHours = Math.max(0.1, (now - postDate) / (1000 * 60 * 60));
    
    return engagement / Math.pow(ageInHours + 2, GRAVITY);
}

export function getTrendingPosts(posts: Post[]): Post[] {
    if (!posts || posts.length === 0) return [];

    const now = Date.now();

    // Filter posts from the last 7 days
    const eligiblePosts = posts.filter(post => {
        const postDate = new Date(post.createdAt).getTime();
        return now - postDate <= SEVEN_DAYS_IN_MS;
    });

    // Sort by trending score descending, fallback to createdAt
    const sortedEligible = [...eligiblePosts].sort((a, b) => {
        const scoreA = calculateTrendingScore(a, now);
        const scoreB = calculateTrendingScore(b, now);
        
        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        }
        
        // Fallback to newer posts if scores are equal
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Take top 3
    const top3 = sortedEligible.slice(0, 3);
    const top3Ids = new Set(top3.map(p => p._id));

    // The rest of the posts in their original order
    const remainingPosts = posts.filter(p => !top3Ids.has(p._id));

    return [...top3, ...remainingPosts];
}
