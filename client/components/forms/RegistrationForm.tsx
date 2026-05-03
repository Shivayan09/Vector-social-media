"use client";

<<<<<<< HEAD
=======
import { Button } from "../ui/button";
import Link from "next/link";
>>>>>>> 0950a0513cb1bd3390652029714c00833baec460
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { GoogleLogin } from "@react-oauth/google";
import type { GoogleCredentialResponseLite } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, type RegistrationFormData } from "@/lib/validation";
import { motion } from "framer-motion";

export default function RegistrationForm() {
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const { refreshAuth } = useAppContext();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
  });

  const onSubmit = async (formData: RegistrationFormData) => {
    try {
      setLoading(true);

      // Split full name into name + surname
      const nameParts = formData.fullName.trim().split(/\s+/);
      const name = nameParts[0];
      const surname = nameParts.slice(1).join(" ") || nameParts[0];

      // Auto-generate username from email
      const base = formData.email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .slice(0, 15);
      const username = base + "_" + Date.now().toString(36).slice(-5);

      const { data } = await axios.post(
        BACKEND_URL + "/api/auth/register",
        {
          name,
          surname,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          username,
          bio: "",
          description: "",
        },
        { withCredentials: true }
      );

      if (!data.success) {
        toast.warn(data.message);
        return;
      }

      await refreshAuth();
      toast.success("Account created successfully!");
      router.replace("/main");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credentialResponse: GoogleCredentialResponseLite) => {
    try {
      await axios.post(
        BACKEND_URL + "/api/auth/google",
        { credential: credentialResponse.credential },
        { withCredentials: true }
      );
      toast.success("Signed up successfully!");
      await refreshAuth();
      router.push("/main");
    } catch {
      toast.error("Google sign up failed");
    }
  };

  return (
    <div className="h-screen overflow-y-auto flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px]"
      >
        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-1">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="px-7 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Login
            </button>
            <span className="px-7 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow">
              Sign Up
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-black/30 border border-white/15 rounded-2xl shadow-2xl">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="mt-1 mb-7 text-white/60 text-sm">Join us and start your adventure</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
                  <input
                    {...register("fullName")}
                    type="text"
                    placeholder="John Doe"
                    className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="john@example.com"
                    className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
                  <input
                    {...register("phoneNumber")}
                    type="tel"
                    placeholder="+91 1234567890"
                    className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.phoneNumber.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    className="w-full h-12 pl-10 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
                  <input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="w-full h-12 pl-10 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  >
                    {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    {...register("terms")}
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded accent-purple-500 shrink-0"
                  />
                  <span className="text-sm text-white/70 leading-snug">
                    I agree to the{" "}
                    <span className="text-purple-400 hover:underline cursor-pointer">Terms &amp; Conditions</span>
                    {" "}and{" "}
                    <span className="text-purple-400 hover:underline cursor-pointer">Privacy Policy</span>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.terms.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !isValid}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-sm text-white/50">or signup with</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Social Buttons */}
            <div className="space-y-3">
              <div className="w-full overflow-hidden rounded-xl">
                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => toast.error("Google sign up failed")}
                  theme="outline"
                  size="large"
                  width="340"
                  text="continue_with"
                />
              </div>
              <button
                type="button"
                onClick={() => toast.info("GitHub sign up coming soon")}
                className="w-full h-12 flex items-center justify-center gap-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/10 transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-white/40">
              Protected by reCAPTCHA and subject to the{" "}
              <span className="text-purple-400 cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
