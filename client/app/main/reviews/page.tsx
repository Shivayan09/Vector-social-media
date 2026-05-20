"use client";

import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import InlineLoader from "@/components/loaders/InlineLoader";

type Review = {
  _id: string;
  stars: number;
  comment?: string;
  author?: { username?: string; name?: string; avatar?: string };
  createdAt?: string;
};

export default function ReviewsPage() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!BACKEND_URL) return;
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/reviews`, {
          withCredentials: true,
        });
        setReviews(data.reviews || []);
      } catch (err: unknown) {
        console.error(err);
        toast.error("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [BACKEND_URL]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!BACKEND_URL) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/reviews`,
        { stars, comment },
        { withCredentials: true },
      );
      if (data?.review) {
        setReviews((s) => [data.review, ...s]);
        setComment("");
        setStars(5);
        toast.success("Thanks for your review!");
      }
    } catch (err: unknown) {
      console.error(err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : undefined;
      toast.error(message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden py-5 px-4 sm:px-7">
      <header className="space-y-1">
        <p className="page-title text-[1.6rem]">Reviews</p>
        <p className="page-subtitle">Share your feedback about Vector</p>
      </header>

      <div className="mt-6 space-y-6">
        <section className="panel-card p-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setStars(n)}
                    className={`px-2 py-1 rounded ${n <= stars ? "bg-yellow-400 text-black" : "border border-border bg-card"}`}
                  >
                    {n}★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2 w-full rounded border border-border bg-card p-2 text-sm"
                rows={4}
              />
            </div>

            <div>
              <button disabled={submitting} className="btn-primary">
                {submitting ? <InlineLoader /> : "Post review"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Recent reviews</h2>
          {loading ? (
            <InlineLoader />
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews yet — be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r._id} className="panel-card p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                      <Image
                        src={r.author?.avatar || "/default-avatar.png"}
                        width={40}
                        height={40}
                        alt={r.author?.name || r.author?.username || "user"}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="truncate text-sm font-medium">
                            {r.author?.name || r.author?.username || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.createdAt || "").toLocaleString()}
                          </p>
                        </div>
                        <div className="text-sm font-semibold">{r.stars}★</div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
