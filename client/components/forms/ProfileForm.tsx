"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/lib/error";

export default function ProfileForm() {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [formError, setFormError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setFormError("Only image files are allowed");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setFormError("Avatar image must be less than 5MB");
            return;
        }
        setFormError("");
        setAvatarFile(file);
        const url = URL.createObjectURL(file);
        setPreview(url);
    };

    const handleRemove = () => {
        setPreview(null);
        setAvatarFile(null);
        if (fileRef.current) {
            fileRef.current.value = "";
        }
    };

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        // ── Validate username ──────────────────────────────────────────────
        if (!username.trim()) {
            setFormError("Enter username");
            return;
        }
        if (username.trim().length < 3 || username.trim().length > 30) {
            setFormError("Username must be between 3 and 30 characters.");
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
            setFormError("Username can only contain letters, numbers, underscores, and hyphens.");
            return;
        }

        // ── Validate bio ───────────────────────────────────────────────────
        if (!bio.trim()) {
            setFormError("Enter bio");
            return;
        }
        if (bio.length > 30) {
            setFormError("Bio must not exceed 30 characters.");
            return;
        }

        // ── Validate description ───────────────────────────────────────────
        if (!description.trim()) {
            setFormError("Enter description");
            return;
        }
        if (description.length > 200) {
            setFormError("Description must not exceed 200 characters.");
            return;
        }

        try {
            setLoading(true);

            // ── Upload avatar (non-fatal if it fails) ──────────────────────
            if (avatarFile) {
                try {
                    const formData = new FormData();
                    formData.append("avatar", avatarFile);
                    await axios.post(BACKEND_URL + "/api/users/avatar", formData, { withCredentials: true });
                } catch {
                    toast.warn("Avatar upload failed. You can update it later.");
                }
            }

            const { data } = await axios.post(
                BACKEND_URL + "/api/auth/profileSetup",
                { username, bio, description },
                { withCredentials: true }
            );

            if (data.success) {
                toast.success("Profile created successfully!");
                router.replace("/main");
                return;
            } else {
                setFormError(data.message || "Profile setup failed");
                toast.error(data.message);
            }
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            setFormError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="form-card mx-auto flex w-[90vw] flex-col items-center justify-center md:w-[40vw]">
            <p className="text-foreground text-center text-[1.8rem] font-bold">Set up your profile</p>

            <div>
                <div className="flex items-center gap-10 my-5">
                    <div onClick={() => fileRef.current?.click()} className="avatar-upload group mx-auto h-25 w-25 outline-2 outline-neutral-200 hover:outline-4 md:h-35 md:w-35">
                        {preview ? (
                            <Image src={preview} alt="pfp preview" width={140} height={140} unoptimized className="h-full w-full object-cover rounded-full" />
                        ) : (
                            <Plus strokeWidth={0.7} className="h-12 w-12 opacity-50 transition-all duration-200 group-hover:scale-110" />
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-5">
                        <Button className="h-10 cursor-pointer bg-blue-500 text-white hover:bg-blue-600" onClick={() => fileRef.current?.click()}>
                            Upload picture
                        </Button>
                        <Button onClick={handleRemove} className="glass-surface-strong h-10 cursor-pointer text-foreground hover:bg-accent/70">
                            Discard picture
                        </Button>
                    </div>
                </div>

                {preview && (
                    <div onClick={handleRemove} className="absolute top-14 right-5 h-9 w-9 flex items-center justify-center rounded-full cursor-pointer hover:bg-neutral-100">
                        <X strokeWidth={1.2} className="h-5 w-5 opacity-70" />
                    </div>
                )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <div className="w-full">
                <p className="form-label text-left">Set a username</p>
                <div className="form-inline-input">
                    <p>@</p>
                    <input
                        type="text"
                        placeholder="demouser09"
                        className="h-full w-full outline-none"
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between mt-3">
                    <p className="form-label !mt-0">Set a bio</p>
                    <span className={`text-xs ${bio.length > 30 ? "text-red-500" : "text-muted-foreground"}`}>
                        {bio.length}/30
                    </span>
                </div>
                <textarea
                    placeholder="Enter your bio (30 characters max)"
                    className="form-textarea h-10 py-1"
                    onChange={(e) => setBio(e.target.value)}
                />

                <div className="flex items-center justify-between mt-3">
                    <p className="form-label !mt-0">Set a description</p>
                    <span className={`text-xs ${description.length > 200 ? "text-red-500" : "text-muted-foreground"}`}>
                        {description.length}/200
                    </span>
                </div>
                <textarea
                    placeholder="Enter your description (200 characters max)"
                    className="form-textarea h-20 py-1"
                    onChange={(e) => setDescription(e.target.value)}
                />

                {formError && (
                    <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {formError}
                    </p>
                )}

                <Button
                    disabled={loading}
                    className={`h-10 mt-2 w-full ${loading ? "cursor-not-allowed bg-blue-400" : "cursor-pointer bg-blue-500 hover:bg-blue-600"}`}
                    onClick={handleSubmit}
                >
                    {loading ? "Setting your profile.." : "Continue"}
                </Button>
            </div>
        </div>
    );
}
