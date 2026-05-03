"use client";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { GoogleLogin } from "@react-oauth/google";
import type { GoogleCredentialResponseLite } from "@/lib/types";

export default function LoginForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const { isLoggedIn, refreshAuth } = useAppContext();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        if (isLoggedIn) {
            router.replace("/main");
        }
    }, [isLoggedIn, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { data } = await axios.post(
                BACKEND_URL + "/api/auth/login",
                { username, password },
                { withCredentials: true }
            );

            if (data.success) {
                toast.success("Logged in successfully!");
                await refreshAuth();
                return;
            } else {
                toast.warn(data.message);
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

    const handleGoogle = async (
        credentialResponse: GoogleCredentialResponseLite
    ) => {
        try {
            await axios.post(
                BACKEND_URL + "/api/auth/google",
                { credential: credentialResponse.credential },
                { withCredentials: true }
            );
            toast.success("Logged in successfully!");
            await refreshAuth();
            router.push("/main");
        } catch {
            toast.error("Google login failed");
        }
    };

    return (
        <div className="form-card w-80 md:w-90">
            <p className="form-title">
                Welcome back!
            </p>

            <p className="form-subtitle md:text-[1.1rem]">
                Log in to get right back in!
            </p>

            {/* GOOGLE BUTTON */}
            <GoogleLogin
                    onSuccess={handleGoogle}
                    onError={() => toast.error("Google login failed")}
                    theme="outline"
                    size="medium"
                />

            <div className="relative flex items-center justify-center mt-5">
                <div className="form-divider"></div>
                <span className="form-divider-text backdrop-blur-3xl">
                    or
                </span>
            </div>

            <p className="form-label">Username</p>
            <input
                type="text"
                placeholder="demousername09"
                className="form-input"
                onChange={(e) => setUsername(e.target.value)}
            />

            <p className="form-label">Password</p>

            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="form-input pr-10"
                    onChange={(e) => setPassword(e.target.value)}
                />

                <span
                    className="surface-text-muted absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </span>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-[0.9rem] text-foreground">
                    Forgot your password?
                </p>
                <span
                    className="cursor-pointer text-primary underline"
                    onClick={() => router.push("/auth/forgot-password")}
                >
                    Click here
                </span>
            </div>

            <Button
                disabled={loading}
                className={`w-full mt-5 cursor-pointer dark:text-white ${
                    loading
                        ? "bg-blue-400"
                        : "bg-blue-500 hover:bg-blue-600"
                }`}
                onClick={handleLogin}
            >
                {loading ? "Logging in" : "Log in"}
            </Button>

            <div className="flex items-center justify-between mt-3">
                <p className="mt-3 text-[0.9rem] text-foreground">
                    Don&apos;t have an account?
                </p>
                <span
                    className="mt-1 cursor-pointer font-semibold text-primary underline"
                    onClick={() => router.push("/auth/register")}
                >
                    Register
                </span>
            </div>
        </div>
    );
}
