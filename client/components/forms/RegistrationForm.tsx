"use client";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";

export default function RegistrationForm() {
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const { refreshAuth } = useAppContext();
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const nextStep = () => {
    if (!name.trim()) return toast.warn("Enter first name");
    if (!surname.trim()) return toast.warn("Enter last name");
    if (!email.trim()) return toast.warn("Enter email");
    if (!phoneNumber.trim()) return toast.warn("Enter phone number");
    if (!password.trim()) return toast.warn("Enter password");
    if (password.length < 6) return toast.warn("Password too short");
    if (password !== confirmPassword)
      return toast.warn("Passwords do not match");

    setStep(2);
  };

  const handleSubmit = async () => {
    if (!username.trim()) return toast.warn("Enter username");
    if (!bio.trim()) return toast.warn("Enter bio");
    if (!description.trim()) return toast.warn("Enter description");

    try {
      setLoading(true);
      const { data } = await axios.post(
        BACKEND_URL + "/api/auth/register",
        {
          name,
          surname,
          email,
          phoneNumber,
          password,
          username,
          bio,
          description,
        },
        { withCredentials: true },
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-black/10 dark:border-white/10 backdrop-blur-3xl rounded-lg px-5 md:px-10 py-6 w-80 md:w-fit">
      <div className="w-full h-0.75 bg-white/10 rounded-full mb-5">
        <div
          className={`h-full bg-blue-500 transition-all duration-300 ${step === 1 ? "w-1/2" : "w-full"}`}
        />
      </div>

      {step === 1 && (
        <>
          <p className="font-semibold text-[1rem] md:text-[1.2rem] text-white">
            Welcome to Vector!
          </p>

          <p className="mt-2 mb-5 text-[0.9rem] md:text-[1rem] text-gray-300">
            Register to start posting right away!
          </p>

          {/* Inputs */}
          <input
            placeholder="First Name"
            className="input"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Last Name"
            className="input mt-2"
            onChange={(e) => setSurname(e.target.value)}
          />
          <input
            placeholder="Email"
            className="input mt-2"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Phone Number"
            className="input mt-2"
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* Password */}
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="input pr-10"
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="eye"
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </span>
          </div>

          <div className="relative mt-2">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="input pr-10"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <span
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="eye"
            >
              {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </span>
          </div>

          <Button
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
            onClick={nextStep}
          >
            Continue
          </Button>

          {/* ✅ REQUIRED CHANGE (ISSUE #35) */}
          <Button
            variant="ghost"
            className="w-full mt-2 text-sm text-blue-400 hover:underline"
            onClick={() => router.push("/login")}
          >
            Already have an account? Login
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="font-bold text-center text-white mb-4">
            Set up your profile
          </p>

          <div className="flex justify-center my-5">
            <div onClick={() => fileRef.current?.click()} className="avatar">
              {preview ? (
                <img src={preview} className="avatar-img" />
              ) : (
                <Plus />
              )}
            </div>
          </div>

          <input ref={fileRef} type="file" hidden onChange={handleFileChange} />

          <input
            placeholder="Username"
            className="input"
            onChange={(e) => setUsername(e.target.value)}
          />
          <textarea
            placeholder="Bio"
            className="input mt-2"
            onChange={(e) => setBio(e.target.value)}
          />
          <textarea
            placeholder="Description"
            className="input mt-2"
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2 mt-4">
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
git add .