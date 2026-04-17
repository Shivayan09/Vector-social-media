"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = use(params);
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) {
            toast.warn("Please enter a new password!");
            return;
        }
        if (newPassword.length < 6) {
            toast.warn("Password must be at least 6 characters!");
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.post(
                BACKEND_URL + "/api/auth/reset-password",
                { resetToken: token, newPassword }
            );
            if (data.success) {
                toast.success("Password reset successful");
                router.push("/auth/login");
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
                    Reset Password
                </p>
                <p className="mt-2 mb-5 text-[0.9rem] md:text-[1rem] text-gray-300">
                    Enter your new password below.
                </p>

                <p className="font-semibold text-white">New Password</p>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="outline-none h-10 bg-white/30 dark:border-white/10 w-full rounded-md p-3 my-3 pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black/50"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </span>
                </div>

                <Button
                    disabled={loading}
                    className={`w-full mt-2 cursor-pointer dark:text-white ${
                        loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    onClick={handleSubmit}
                >
                    {loading ? "Resetting..." : "Reset Password"}
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
