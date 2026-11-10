import type { Metadata } from "next";

type Props = {
  params: Promise<{ postId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const title = `Post ${postId} | Vector`;
  const description = "Check out this post on Vector - Social Media";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Vector",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
