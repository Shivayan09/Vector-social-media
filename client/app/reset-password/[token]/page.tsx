"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error";

// Same rule as registerSchema and resetPasswordSchema on the backend
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

export default function ResetPasswordPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = use(params);
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        if (!PASSWORD_REGEX.test(newPassword)) {
            toast.warn(
                "Password must contain at least one uppercase letter, one lowercase letter, and one number!"
            );
            return;
        }
        if (!confirmPassword) {
            toast.warn("Please confirm your password!");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.warn("Passwords do not match!");
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
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="form-card w-80 md:w-90">
                <p className="form-title">Reset Password</p>
                <p className="form-subtitle">
                    Enter your new password below.
                </p>

                {/* ✅ Wrapped in form — Enter key now submits */}
                <form onSubmit={handleSubmit}>
                    {/* New Password */}
                    <p className="form-label">New Password</p>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="form-input pr-10"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <span
                            className="surface-text-muted absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                        </span>
                    </div>
                    <p className="text-xs surface-text-muted mt-1">
                        Must be 6+ characters with uppercase, lowercase, and a number.
                    </p>

                    {/* Confirm Password */}
                    <p className="form-label mt-3">Confirm Password</p>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="form-input pr-10"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <span
                            className="surface-text-muted absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                        </span>
                    </div>

                    {/* ✅ type="submit" — no onClick needed */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className={`w-full mt-4 cursor-pointer dark:text-white ${
                            loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                </form>

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