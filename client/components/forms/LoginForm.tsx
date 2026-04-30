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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validation";

export default function LoginForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { isLoggedIn, refreshAuth } = useAppContext();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onBlur",
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
        <div className="border border-black/10 dark:border-white/10 backdrop-blur-3xl rounded-lg px-10 py-5 w-80 md:w-90">
            <p className="font-semibold text-[1rem] md:text-[1.2rem] text-white">
                Welcome back!
            </p>

            <p className="mt-2 mb-5 text-[0.9rem] md:text-[1.1rem] text-gray-300">
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
                <div className="absolute w-full h-px bg-white/20"></div>
                <span className="relative px-3 text-md text-white/70 backdrop-blur-3xl">
                    or
                </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <p className="font-semibold text-white">Username</p>
                <input
                    {...register("username")}
                    type="text"
                    placeholder="demousername09"
                    className="outline-none h-10 bg-white/30 dark:border-white/10 w-full rounded-md p-3 my-3"
                />
                {errors.username && (
                    <p className="text-red-400 text-sm -mt-2 mb-2">{errors.username.message}</p>
                )}

                <p className="font-semibold text-white">Password</p>

                <div className="relative">
                    <input
                        {...register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="outline-none h-10 bg-white/30 dark:border-white/10 w-full rounded-md p-3 my-3 pr-10"
                    />

                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black/50"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </span>
                </div>
                {errors.password && (
                    <p className="text-red-400 text-sm -mt-2 mb-2">{errors.password.message}</p>
                )}

                <div className="flex items-center justify-between">
                    <p className="text-[0.9rem] text-white">
                        Forgot your password?
                    </p>
                    <span
                        className="text-blue-800 underline cursor-pointer"
                        onClick={() => router.push("/auth/forgot-password")}
                    >
                        Click here
                    </span>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-5 cursor-pointer dark:text-white ${
                        loading
                            ? "bg-blue-400"
                            : "bg-blue-500 hover:bg-blue-600"
                    }`}
                >
                    {loading ? "Logging in" : "Log in"}
                </Button>
            </form>

            <div className="flex items-center justify-between mt-3">
                <p className="text-[0.9rem] mt-3 text-white">
                    Don&apos;t have an account?
                </p>
                <span
                    className=" font-semibold underline cursor-pointer mt-1 text-white"
                    onClick={() => router.push("/auth/register")}
                >
                    Register
                </span>
            </div>
        </div>
    );
}
