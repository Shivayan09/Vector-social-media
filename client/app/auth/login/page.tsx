"use client"

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

export default function Login() {

    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const handleLogin = async (e: any) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { data } = await axios.post(BACKEND_URL + '/api/auth/login', { email, password }, { withCredentials: true });
            if (data.success) {
                toast.success("Logged in successfully");
                router.push('/');
                return;
            } else {
                toast.warn(data.message);
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                toast.error(error.response.data.errors[0].message);
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col-reverse md:flex-row md:h-screen">
            <div className="w-full md:w-[30%] p-7">
                <div className="md:hidden flex items-center justify-center gap-2 mb-5 md:mb-0">
                    <img src="/vector.png" alt="" className="h-10 w-10 rounded-lg"/>
                    <p className="text-blue-500 font-semibold text-[1.5rem]">Vector</p>
                </div>
                <p className="font-semibold text-blue-500 text-[1.2rem] md:text-[1.5rem]">Welcome to Vector</p>
                <p className="text-gray-500 mt-3 mb-5">Log in to get right back in</p>
                <button onClick={() => { window.location.href = BACKEND_URL+'/api/auth/google'; }} className="flex items-center justify-center cursor-pointer transition-all duration-200 gap-2 border h-10 rounded-lg w-full bg-blue-50 hover:bg-gray-100">
                    <img src="/Google.png" alt="" className="h-5" />
                    Continue with Google
                </button>
                <div className="relative flex items-center justify-center mt-5">
                    <div className="absolute w-full h-px bg-black/20"></div>
                    <span className="relative px-3 text-md backdrop-blur-3xl">
                        or
                    </span>
                </div>
                <p className="mt-3">Email</p>
                <input type="email" placeholder="demoemail@gmail.com" className="outline-none h-10 bg-blue-500/5 w-full rounded-lg p-3 my-3"
                    onChange={(e) => setEmail(e.target.value)} />
                <p className="mt-2">Password</p>
                <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="Enter your password" className="outline-none h-10 bg-blue-500/5 w-full rounded-lg p-3 my-3"
                        onChange={(e) => setPassword(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black/50" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </span>
                </div>
                <div className="text-[0.9rem] flex items-center justify-between mt-3">
                    <p className="text-blue-400">Forgot your password?</p>
                    <span className="text-blue-400 underline cursor-pointer">Click here</span>
                </div>
                <button disabled={loading} className={`w-full mt-5 cursor-pointer h-10 text-white rounded-lg flex items-center justify-center gap-1 transition-all duration-200 group ${loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"}`} onClick={handleLogin}>
                    {loading ? "Logging in.." : "Log in"}
                    {!loading && <ArrowRight className="h-4 text-white transition-all duration-200 group-hover:translate-x-1" />}
                </button>
                <div className="flex items-center justify-between text-[0.9rem] mt-3">
                    <p className="text-blue-400">
                        Don't have an account?
                    </p>
                    <span className="underline cursor-pointer text-blue-400" onClick={() => router.push('/auth/register')}>
                        Register
                    </span>
                </div>
            </div>
            <div className="w-full hidden md:flex md:w-[70%] items-center justify-center bg-[#1f80ff]">
                <img src="/vector.png" alt="" className="h-80" />
            </div>
        </div>
    );
}