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
        <div className="auth-page">
            <div className="form-card w-80 md:w-90">
                <p className="form-title">
                    Forgot Password
                </p>
                <p className="form-subtitle">
                    Enter your email and we&apos;ll send you a reset link.
                </p>

                <p className="form-label">Email</p>
                <input
                    type="email"
                    placeholder="you@example.com"
                    className="form-input"
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
                        className="surface-text-muted cursor-pointer text-[0.9rem] underline"
                        onClick={() => router.push("/auth/login")}
                    >
                        Back to Login
                    </span>
                </div>
            </div>
        </div>
    );
}
