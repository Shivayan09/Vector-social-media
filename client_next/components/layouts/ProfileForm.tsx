"use client";

import { Button } from "@/components/ui/button";
import axios from "axios";
import { Camera, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

export default function ProfileForm() {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(false);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
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
        try {
            setLoading(true);
            if (avatarFile) {
                const formData = new FormData();
                formData.append("avatar", avatarFile);
                await axios.post(BACKEND_URL + "/api/users/avatar", formData, { withCredentials: true });
            }
            const { data } = await axios.post(BACKEND_URL + "/api/auth/profileSetup", { username, bio, description }, { withCredentials: true });
            if (data.success) {
                toast.success("Profile created successfully!");
                router.replace("/main");
                return;
            } else {
                toast.error(data.message);
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


    return (
        <div className="flex flex-col items-center justify-center mx-auto border border-black/10 rounded-2xl w-[90vw] md:w-[40vw] px-10 py-5">
            <p className="font-bold text-center text-[1.8rem] text-neutral-600">Set up your profile</p>

            <div>
                <div className="flex items-center gap-10 my-5">
                    <div onClick={() => fileRef.current?.click()} className="h-35 w-35 relative group flex items-center justify-center border border-black/10 rounded-full mx-auto outline-2 outline-neutral-200 bg-white/10 transition-all duration-200 hover:outline-4 cursor-pointer overflow-hidden">
                        {preview ? (
                            <img src={preview} alt="pfp preview" className="h-full w-full object-cover rounded-full" />
                        ) : (
                            <Plus strokeWidth={0.7} className="h-12 w-12 opacity-50 transition-all duration-200 group-hover:scale-110" />
                        )}
                    </div>
                    <div className="flex gap-5">
                        <Button className="h-10 cursor-pointer bg-blue-500 text-white hover:bg-blue-600" onClick={() => fileRef.current?.click()}>
                            Upload picture
                        </Button>
                        <Button className="h-10 cursor-pointer bg-black/70 dark:bg-white dark:hover:bg-white/70">
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
                <p className="font-semibold text-left">Set a username</p>
                <div className="my-3 border border-black/10 dark:border-white/10 bg-black/3 flex items-center px-3 h-10 rounded-lg gap-2">
                    <p>@</p>
                    <input type="text" placeholder="demouser09" className="h-full w-full outline-none"
                        onChange={(e) => setUsername(e.target.value)} />
                </div>
                <p className="font-semibold">Set a bio</p>
                <textarea placeholder="Enter your bio (30 words max)" className="w-full border outline-0 px-3 py-1 rounded-md mt-2 h-10 bg-black/3"
                    onChange={(e) => setBio(e.target.value)} />
                <p className="font-semibold mt-3">Set a description</p>
                <textarea placeholder="Enter your bio (200 words max)" className="w-full border outline-0 px-3 py-1 rounded-md mt-2 h-20 bg-black/3"
                    onChange={(e) => setDescription(e.target.value)} />
                <Button disabled={loading} className={`h-10 mt-2 w-full ${loading ? 'cursor-not-allowed bg-blue-400' : 'cursor-pointer bg-blue-500 hover:bg-blue-600'}`} onClick={handleSubmit}>
                    {loading ? 'Setting your profile..' : 'Continue'}
                </Button>
            </div>
        </div>
    );
}
