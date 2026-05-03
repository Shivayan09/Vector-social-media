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
    if (!file) {
      return;
    }
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const nextStep = () => {
    if (!name.trim()) {
      return toast.warn("Enter first name");
    }
    if (!surname.trim()) {
      return toast.warn("Enter last name");
    }
    if (!email.trim()) {
      return toast.warn("Enter email");
    }
    if (!phoneNumber.trim()) {
      return toast.warn("Enter phone number");
    }
    if (!password.trim()) {
      return toast.warn("Enter password");
    }
    if (password.length < 6) {
      return toast.warn("Password too short");
    }
    if (password !== confirmPassword) {
      return toast.warn("Passwords do not match");
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      return toast.warn("Enter username");
    }
    if (!bio.trim()) {
      return toast.warn("Enter bio");
    }
    if (!description.trim()) {
      return toast.warn("Enter description");
    }
    try {
      setLoading(true);
      const { data } = await axios.post(BACKEND_URL + "/api/auth/register", { name, surname, email, phoneNumber, password, username, bio, description }, { withCredentials: true });
      if (!data.success) {
        toast.warn(data.message);
        return;
      }
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        await axios.post(BACKEND_URL + "/api/users/avatar", formData, { withCredentials: true });
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
  };

  return (
    <div className="form-card w-80 md:w-fit">

      <div className="mb-5 h-0.75 w-full rounded-full bg-border/70">
        <div className={`h-full bg-blue-500 transition-all duration-300 ${step === 1 ? "w-1/2" : "w-full"}`} />
      </div>

      {step === 1 && (
        <>
          <p className="form-title">
            Welcome to Vector!
          </p>

          <p className="form-subtitle">
            Register to start posting right away!
          </p>

          <div className="flex flex-col md:flex-row gap-2 md:gap-5">
            <div className="w-full">
              <p className="form-label">First Name</p>
              <input type="text" placeholder="demo" className="form-input" onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="w-full">
              <p className="form-label">Last Name</p>
              <input type="text" placeholder="user" className="form-input" onChange={(e) => setSurname(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-5">
            <div className="w-full">
              <p className="form-label">Email</p>
              <input type="email" placeholder="demo@gmail.com" className="form-input" onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="w-full">
              <p className="form-label">Phone number</p>
              <input type="tel" placeholder="+00 00000 00000" className="form-input" onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <p className="form-label mt-2">
            Set a password
          </p>

          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Enter a password" className="form-input pr-10" onChange={(e) => setPassword(e.target.value)} />

            <span className="surface-text-muted absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </span>
          </div>

          <p className="form-label">
            Confirm your password
          </p>

          <div className="relative">
            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" className="form-input pr-10" onChange={(e) => setConfirmPassword(e.target.value)} />

            <span className="surface-text-muted absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)} >
              {showConfirmPassword ? (
                <Eye size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </span>
          </div>

          <Button className="w-full text-white mt-5 cursor-pointer bg-blue-500 hover:bg-blue-600" onClick={nextStep}>
            Continue
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mb-4 text-center text-[1.2rem] font-bold text-foreground">
            Set up your profile
          </p>

          <div className="flex justify-center my-5">
            <div onClick={() => fileRef.current?.click()} className="avatar-upload h-28 w-28 outline-2 outline-neutral-200 hover:outline-4" >
              {preview ? (
                <img alt="Profile preview" src={preview} className="h-full w-full object-cover rounded-full" />
              ) : (
                <Plus className="h-10 w-10 opacity-50" />
              )}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <p className="form-label">Set a username</p>

          <div className="form-inline-input">
            <p>@</p>
            <input placeholder="demouser09" className="h-full w-full outline-none bg-transparent" onChange={(e) => setUsername(e.target.value)} />
          </div>

          <p className="form-label">Set a bio</p>

          <textarea placeholder="Enter your bio (30 words max)" className="form-textarea h-12 md:w-90" onChange={(e) => setBio(e.target.value)} />

          <p className="form-label mt-3">
            Set a description
          </p>

          <textarea placeholder="Enter your bio (200 words max)" className="form-textarea h-24" onChange={(e) => setDescription(e.target.value)} />

          <div className="flex justify-between gap-2 mt-4">
            <Button className="bg-white/80 text-black hover:bg-white" onClick={() => setStep(1)}>
              Back
            </Button>

            <Button disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSubmit}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
