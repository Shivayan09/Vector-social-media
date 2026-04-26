"use client";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Eye, EyeOff, Plus, User, Mail, Phone, Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft, AtSign, FileText } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationStep1Schema, registrationStep2Schema, type RegistrationStep1Data, type RegistrationStep2Data } from "@/lib/validation";
import { motion, AnimatePresence } from "framer-motion";

export default function RegistrationForm() {
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const { refreshAuth } = useAppContext();
  const [step, setStep] = useState(1);

  // Step 1 form
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1, isValid: isValidStep1, touchedFields: touchedStep1 },
    getValues: getValuesStep1,
  } = useForm<RegistrationStep1Data>({
    resolver: zodResolver(registrationStep1Schema),
    mode: "onChange",
  });

  // Step 2 form
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    formState: { errors: errorsStep2, isValid: isValidStep2, touchedFields: touchedStep2 },
    getValues: getValuesStep2,
  } = useForm<RegistrationStep2Data>({
    resolver: zodResolver(registrationStep2Schema),
    mode: "onChange",
  });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const nextStep = handleSubmitStep1(() => {
    setStep(2);
  });

  const handleSubmit = handleSubmitStep2(async (step2Data) => {
    const step1Data = getValuesStep1();
    try {
      setLoading(true);
      const { data } = await axios.post(
        BACKEND_URL + "/api/auth/register",
        {
          ...step1Data,
          ...step2Data,
        },
        { withCredentials: true }
      );
      if (!data.success) {
        toast.warn(data.message);
        return;
      }
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        await axios.post(BACKEND_URL + "/api/users/avatar", formData, {
          withCredentials: true,
        });
      }
      await refreshAuth();
      toast.success("Account created successfully!");
      router.replace("/main");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      {/* Glassmorphism card */}
      <div className="relative backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 pointer-events-none" />

        <div className="relative p-8 md:p-10">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-white/70">Step {step} of 2</span>
              <span className="text-sm text-white/70">{step === 1 ? "Personal Info" : "Profile Setup"}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: step === 1 ? "50%" : "100%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent">
                    Join Vector
                  </h1>
                  <p className="mt-2 text-white/70 text-sm md:text-base">
                    Create your account to get started
                  </p>
                </div>

                <form onSubmit={nextStep} className="space-y-5">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        First Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          {...registerStep1("name")}
                          type="text"
                          placeholder="John"
                          className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                            errorsStep1.name
                              ? "border-red-400/50 focus:border-red-400"
                              : touchedStep1.name && !errorsStep1.name
                              ? "border-green-400/50 focus:border-green-400"
                              : "border-white/20 focus:border-purple-400"
                          } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                        />
                        {touchedStep1.name && !errorsStep1.name && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          </div>
                        )}
                      </div>
                      {errorsStep1.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errorsStep1.name.message}
                        </motion.p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Last Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          {...registerStep1("surname")}
                          type="text"
                          placeholder="Doe"
                          className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                            errorsStep1.surname
                              ? "border-red-400/50 focus:border-red-400"
                              : touchedStep1.surname && !errorsStep1.surname
                              ? "border-green-400/50 focus:border-green-400"
                              : "border-white/20 focus:border-purple-400"
                          } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                        />
                        {touchedStep1.surname && !errorsStep1.surname && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          </div>
                        )}
                      </div>
                      {errorsStep1.surname && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errorsStep1.surname.message}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* Email and Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          {...registerStep1("email")}
                          type="email"
                          placeholder="john@example.com"
                          className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                            errorsStep1.email
                              ? "border-red-400/50 focus:border-red-400"
                              : touchedStep1.email && !errorsStep1.email
                              ? "border-green-400/50 focus:border-green-400"
                              : "border-white/20 focus:border-purple-400"
                          } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                        />
                        {touchedStep1.email && !errorsStep1.email && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          </div>
                        )}
                      </div>
                      {errorsStep1.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errorsStep1.email.message}
                        </motion.p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          {...registerStep1("phoneNumber")}
                          type="tel"
                          placeholder="+1 234 567 8900"
                          className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                            errorsStep1.phoneNumber
                              ? "border-red-400/50 focus:border-red-400"
                              : touchedStep1.phoneNumber && !errorsStep1.phoneNumber
                              ? "border-green-400/50 focus:border-green-400"
                              : "border-white/20 focus:border-purple-400"
                          } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                        />
                        {touchedStep1.phoneNumber && !errorsStep1.phoneNumber && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          </div>
                        )}
                      </div>
                      {errorsStep1.phoneNumber && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errorsStep1.phoneNumber.message}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        {...registerStep1("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                          errorsStep1.password
                            ? "border-red-400/50 focus:border-red-400"
                            : touchedStep1.password && !errorsStep1.password
                            ? "border-green-400/50 focus:border-green-400"
                            : "border-white/20 focus:border-purple-400"
                        } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white/90 transition-colors"
                      >
                        {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </div>
                    {errorsStep1.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errorsStep1.password.message}
                      </motion.p>
                    )}
                    {!errorsStep1.password && touchedStep1.password && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Password strength: Strong
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        {...registerStep1("confirmPassword")}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                          errorsStep1.confirmPassword
                            ? "border-red-400/50 focus:border-red-400"
                            : touchedStep1.confirmPassword && !errorsStep1.confirmPassword
                            ? "border-green-400/50 focus:border-green-400"
                            : "border-white/20 focus:border-purple-400"
                        } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white/90 transition-colors"
                      >
                        {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </div>
                    {errorsStep1.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errorsStep1.confirmPassword.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Continue Button */}
                  <Button
                    type="submit"
                    disabled={!isValidStep1}
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </Button>

                  {/* Login Link */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-white/70">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/auth/login")}
                        className="font-semibold text-purple-400 hover:text-purple-300 transition-colors duration-200"
                      >
                        Log in
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent">
                    Complete Your Profile
                  </h1>
                  <p className="mt-2 text-white/70 text-sm md:text-base">
                    Tell us a bit about yourself
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center">
                    <label className="block text-sm font-medium text-white/90 mb-3">
                      Profile Picture (Optional)
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="relative group"
                    >
                      <div className="h-32 w-32 rounded-full border-2 border-dashed border-white/30 hover:border-purple-400 flex items-center justify-center bg-white/5 cursor-pointer transition-all duration-200 overflow-hidden group-hover:scale-105">
                        {preview ? (
                          <img
                            alt="Profile preview"
                            src={preview}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <Plus className="h-10 w-10 text-white/40 mx-auto mb-2" />
                            <p className="text-xs text-white/60">Upload Photo</p>
                          </div>
                        )}
                      </div>
                      {preview && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-sm">Change Photo</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <p className="mt-2 text-xs text-white/50">Max size: 5MB</p>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <AtSign className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        {...registerStep2("username")}
                        type="text"
                        placeholder="johndoe"
                        className={`w-full h-12 pl-10 pr-10 bg-white/10 border ${
                          errorsStep2.username
                            ? "border-red-400/50 focus:border-red-400"
                            : touchedStep2.username && !errorsStep2.username
                            ? "border-green-400/50 focus:border-green-400"
                            : "border-white/20 focus:border-purple-400"
                        } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200`}
                      />
                      {touchedStep2.username && !errorsStep2.username && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        </div>
                      )}
                    </div>
                    {errorsStep2.username && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errorsStep2.username.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Bio
                    </label>
                    <div className="relative">
                      <textarea
                        {...registerStep2("bio")}
                        placeholder="Tell us about yourself in a few words..."
                        rows={3}
                        maxLength={150}
                        className={`w-full px-4 py-3 bg-white/10 border ${
                          errorsStep2.bio
                            ? "border-red-400/50 focus:border-red-400"
                            : touchedStep2.bio && !errorsStep2.bio
                            ? "border-green-400/50 focus:border-green-400"
                            : "border-white/20 focus:border-purple-400"
                        } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200 resize-none`}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-white/50">
                        {getValuesStep2("bio")?.length || 0}/150
                      </div>
                    </div>
                    {errorsStep2.bio && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errorsStep2.bio.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Description
                    </label>
                    <div className="relative">
                      <textarea
                        {...registerStep2("description")}
                        placeholder="Share more details about yourself, your interests, or what you do..."
                        rows={5}
                        maxLength={500}
                        className={`w-full px-4 py-3 bg-white/10 border ${
                          errorsStep2.description
                            ? "border-red-400/50 focus:border-red-400"
                            : touchedStep2.description && !errorsStep2.description
                            ? "border-green-400/50 focus:border-green-400"
                            : "border-white/20 focus:border-purple-400"
                        } rounded-xl text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200 resize-none`}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-white/50">
                        {getValuesStep2("description")?.length || 0}/500
                      </div>
                    </div>
                    {errorsStep2.description && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-400 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errorsStep2.description.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-200"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <ArrowLeft className="h-5 w-5" />
                        Back
                      </span>
                    </Button>

                    <Button
                      type="submit"
                      disabled={loading || !isValidStep2}
                      className="flex-[2] h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Creating Account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
