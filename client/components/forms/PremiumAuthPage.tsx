"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "react-toastify";
import { useAppContext } from "@/context/AppContext";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  Github,
  Phone,
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import type { GoogleCredentialResponseLite } from "@/lib/types";

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function PremiumAuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { refreshAuth } = useAppContext();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      rememberMe: false,
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      agreeToTerms: false,
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      setLoading(true);
      const response = await axios.post(
        BACKEND_URL + "/api/auth/login",
        { username: data.username, password: data.password },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Logged in successfully!");
        await refreshAuth();
      } else {
        toast.warn(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    try {
      setLoading(true);
      const response = await axios.post(
        BACKEND_URL + "/api/auth/register",
        {
          name: data.name.split(" ")[0],
          surname: data.name.split(" ")[1] || data.name.split(" ")[0],
          email: data.email,
          phoneNumber: data.phoneNumber,
          password: data.password,
          username: data.email.split("@")[0],
          bio: "New user",
          description: "Just joined Vector!",
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Account created successfully!");
        await refreshAuth();
        router.push("/main");
      } else {
        toast.warn(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      const response = await axios.post(
        BACKEND_URL + "/api/auth/google",
        { credential: tokenResponse.access_token },
        { withCredentials: true }
      );
      toast.success("Logged in successfully!");
      await refreshAuth();
      router.push("/main");
    } catch {
      toast.error("Google login failed");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error("Google login failed"),
  });

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = signupForm.watch("password")
    ? getPasswordStrength(signupForm.watch("password"))
    : 0;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="">
          <div className="relative flex p-2 ">
            <motion.div
              className="absolute top-2 bottom-2 bg-gradient-to-r from-blue-1500 to-purple-500 rounded-xl"
              animate={{
                x: activeTab === "login" ? 0 : "100%",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ width: "calc(50% - 8px)" }}
            />
            <button
              onClick={() => setActiveTab("login")}
              className={`relative z-10 flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "login" ? "text-white" : "text-white/60"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`relative z-10 flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "signup" ? "text-white" : "text-white/60"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-white/60 text-sm mb-6">Continue your journey with us</p>

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Username</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...loginForm.register("username")}
                          type="text"
                          placeholder="Enter your username"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                      {loginForm.formState.errors.username && (
                        <p className="mt-1 text-sm text-red-400">{loginForm.formState.errors.username.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...loginForm.register("password")}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="mt-1 text-sm text-red-400">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          {...loginForm.register("rememberMe")}
                          type="checkbox"
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                        <span className="text-sm text-white/60">Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => router.push("/auth/forgot-password")}
                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Logging in...
                        </span>
                      ) : (
                        "Login"
                      )}
                    </motion.button>

                    <div className="relative flex items-center justify-center my-6">
                      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <span className="relative px-4 text-xs text-white/50 bg-slate-900">
                        or login with
                      </span>
                    </div>

                    <div className="space-y-3">
                      <button 
                        type="button" 
                        onClick={() => googleLogin()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </button>
                      <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02]">
                        <Github className="w-5 h-5" />
                        Continue with GitHub
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
                  <p className="text-white/60 text-sm mb-6">Join us and start your adventure</p>

                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...signupForm.register("name")}
                          type="text"
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                      {signupForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...signupForm.register("email")}
                          type="email"
                          placeholder="john@example.com"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                      {signupForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...signupForm.register("phoneNumber")}
                          type="tel"
                          placeholder="+91 1234567890"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                      {signupForm.formState.errors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.phoneNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...signupForm.register("password")}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {signupForm.formState.errors.password && (
                        <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.password.message}</p>
                      )}
                      
                      {signupForm.watch("password") && (
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {[...Array(6)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all ${
                                  i < passwordStrength
                                    ? passwordStrength <= 2
                                      ? "bg-red-500"
                                      : passwordStrength <= 4
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                    : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-white/60">
                            Password strength:{" "}
                            <span
                              className={
                                passwordStrength <= 2
                                  ? "text-red-400"
                                  : passwordStrength <= 4
                                  ? "text-yellow-400"
                                  : "text-green-400"
                              }
                            >
                              {passwordStrength <= 2 ? "Weak" : passwordStrength <= 4 ? "Medium" : "Strong"}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                          {...signupForm.register("confirmPassword")}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          {...signupForm.register("agreeToTerms")}
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                        <span className="text-sm text-white/60">
                          I agree to the{" "}
                          <a href="#" className="text-purple-400 hover:text-purple-300">Terms & Conditions</a>{" "}
                          and{" "}
                          <a href="#" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
                        </span>
                      </label>
                      {signupForm.formState.errors.agreeToTerms && (
                        <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.agreeToTerms.message}</p>
                      )}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </motion.button>

                    <div className="relative flex items-center justify-center my-6">
                      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <span className="relative px-4 text-xs text-white/50 bg-slate-900">
                        or signup with
                      </span>
                    </div>

                    <div className="space-y-3">
                      <button 
                        type="button" 
                        onClick={() => googleLogin()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </button>
                      <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02]">
                        <Github className="w-5 h-5" />
                        Continue with GitHub
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-white/40 text-sm p-6">
            Protected by reCAPTCHA and subject to the{" "}
            <a href="#" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
