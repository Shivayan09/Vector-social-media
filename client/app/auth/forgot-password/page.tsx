"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.warn("Please enter your email!");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.warn("Please enter a valid email address!");
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.post(
                BACKEND_URL + "/api/auth/forgot-password",
                { email }
            );
            if (data.success) {
                toast.success("Reset link sent to your email");
            } else {
                toast.error(data.message);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <div className="border border-black/10 dark:border-white/10 backdrop-blur-3xl rounded-lg px-10 py-5 w-80 md:w-90">
                <p className="font-semibold text-[1rem] md:text-[1.2rem] text-white">
                    Forgot Password
                </p>
                <p className="mt-2 mb-5 text-[0.9rem] md:text-[1rem] text-gray-300">
                    Enter your email and we&apos;ll send you a reset link.
                </p>

                <p className="font-semibold text-white">Email</p>
                <input
                    type="email"
                    placeholder="you@example.com"
                    className="outline-none h-10 bg-white/30 dark:border-white/10 w-full rounded-md p-3 my-3"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <Button
                    disabled={loading}
                    className={`w-full mt-2 cursor-pointer dark:text-white ${
                        loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    onClick={handleSubmit}
                >
                    {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="flex items-center justify-center mt-4">
                    <span
                        className="text-[0.9rem] text-white/70 underline cursor-pointer"
                        onClick={() => router.push("/auth/login")}
                    >
                        Back to Login
                    </span>
                </div>
            </div>
        </div>
    );
}
