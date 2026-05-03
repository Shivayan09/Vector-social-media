"use client";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { GoogleLogin } from "@react-oauth/google";
import type { GoogleCredentialResponseLite } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validation";
import { motion } from "framer-motion";

export default function LoginForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { isLoggedIn, refreshAuth } = useAppContext();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const {
        register,
        handleSubmit,
        formState: { errors, isValid, touchedFields },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
    });

    useEffect(() => {
        if (isLoggedIn) {
            router.replace("/main");
        }
    }, [isLoggedIn, router]);

    const onSubmit = async (formData: LoginFormData) => {
        try {
            setLoading(true);
            const { data } = await axios.post(
                BACKEND_URL + "/api/auth/login",
                formData,
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-md mx-auto"
        >
            {/* Glassmorphism card */}
            <div className="relative backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />
                
                <div className="relative p-8 md:p-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent"
                        >
                            Welcome Back!
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-2 text-white/70 text-sm md:text-base"
                        >
                            Log in to continue your journey
                        </motion.p>
                    </div>

                    {/* Google Login */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                    >
                        <GoogleLogin
                            onSuccess={handleGoogle}
                            onError={() => toast.error("Google login failed")}
                            theme="outline"
                            size="large"
                            width="100%"
                        />
                    </motion.div>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-6">
                        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                        <span className="relative px-4 text-sm text-white/70 bg-white/5 backdrop-blur-xl rounded-full">
                            or continue with email
                        </span>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Username Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-white/40" />
                                </div>
                                <input
                                    {...register("username")}
                                    type="text"
                                    placeholder="Enter your username"
                                    className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                                        errors.username
                                            ? "border-red-400/50 focus:border-red-400"
                                            : touchedFields.username && !errors.username
                                            ? "border-green-400/50 focus:border-green-400"
                                            : "border-white/20 focus:border-blue-400"
                                    } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-blue-400/30 transition-all duration-200`}
                                />
                                {touchedFields.username && !errors.username && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                                    </div>
                                )}
                                {errors.username && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <AlertCircle className="h-5 w-5 text-red-400" />
                                    </div>
                                )}
                            </div>
                            {errors.username && (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 text-sm text-red-400 flex items-center gap-1"
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    {errors.username.message}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Password Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-white/40" />
                                </div>
                                <input
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                                        errors.password
                                            ? "border-red-400/50 focus:border-red-400"
                                            : touchedFields.password && !errors.password
                                            ? "border-green-400/50 focus:border-green-400"
                                            : "border-white/20 focus:border-blue-400"
                                    } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-blue-400/30 transition-all duration-200`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white/90 transition-colors"
                                >
                                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 text-sm text-red-400 flex items-center gap-1"
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    {errors.password.message}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => router.push("/auth/forgot-password")}
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Submit Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Button
                                type="submit"
                                disabled={loading || !isValid}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Logging in...
                                    </span>
                                ) : (
                                    "Log In"
                                )}
                            </Button>
                        </motion.div>
                    </form>

                    {/* Sign Up Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-sm text-white/70">
                            Don&apos;t have an account?{" "}
                            <button
                                type="button"
                                onClick={() => router.push("/auth/register")}
                                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-200"
                            >
                                Sign up
                            </button>
                        </p>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
