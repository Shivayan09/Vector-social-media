"use client";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function RegistrationForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <div className="border border-black/10 dark:border-white/10 rounded-lg px-10 py-5">
            <p className="font-semibold text-[1rem] md:text-[1.2rem]">Welcome to Vector!</p>
            <p className="mt-3 mb-5 text-[0.9rem] md:text-[1.05rem]">Register to start posting right away!</p>

            <p className="font-semibold">Full Name</p>
            <input type="text" placeholder="demousername09" className="outline-none h-10 bg-black/5 border dark:border-white/10 w-full rounded-md p-3 my-2 text-[0.95rem]"/>
            
            <p className="font-semibold">Phone number</p>
            <input type="number" placeholder="+0 00000 00000" className="outline-none h-10 bg-black/5 border dark:border-white/10 w-full rounded-md p-3 my-2 text-[0.95rem]"/>

            <p className="font-semibold">Email</p>
            <input type="email" placeholder="demo9@gmail.com" className="outline-none h-10 bg-black/5 border dark:border-white/10 w-full rounded-md p-3 my-2 text-[0.95rem]"/>

            <p className="font-semibold">Set a password</p>
            <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Enter a password" className="outline-none h-10 bg-black/5 border dark:border-white/10 w-full rounded-md p-3 my-2 text-[0.95rem] pr-10"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black/50" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </span>
            </div>

            <p className="font-semibold">Confirm your password</p>
            <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password"className="outline-none h-10 bg-black/5 border dark:border-white/10 w-full rounded-md p-3 my-2 text-[0.95rem] pr-10"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black/50" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </span>
            </div>
            <Button className="w-full mt-5 cursor-pointer bg-blue-500 hover:bg-blue-600">
                Log in
            </Button>
            <p className="text-[0.9rem] mt-3"> Already have an account? <span className="font-semibold ml-20 underline cursor-pointer" onClick={() => router.push('/auth/login')}> Log in</span></p>
        </div>
    );
}
