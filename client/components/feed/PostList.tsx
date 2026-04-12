import PostCard from "./Postcard";

type PostListProps = {
    posts: any[];
};

export default function PostList({ posts }: PostListProps) {
    const safePosts =
        posts?.filter(
            (post) => post?._id && post?.author && post?.author?._id
        ) || [];

    return (
        <div className="flex flex-col gap-3">
            {safePosts.map((post) => (
                <PostCard key={post._id} post={post} />
            ))}
        </div>
    );
}