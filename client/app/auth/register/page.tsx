"use client"

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {

    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhone] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleRegister = async () => {

    }

    return (
        <div className="flex h-screen">
            <div className="w-full md:w-[30%] p-7">
                <p className="text-blue-500 text-[1.6rem]">Welcome to Vector</p>
                <p className="text-gray-500 mt-3 mb-5">Register to dive right in</p>

                <button className="flex items-center justify-center cursor-pointer transition-all duration-200 gap-2 border h-10 rounded-lg w-full bg-blue-50 hover:bg-gray-100">
                    <img src="/Google.png" alt="" className="h-5" />
                    Continue with Google
                </button>

                <div className="relative flex items-center justify-center mt-5">
                    <div className="absolute w-full h-px bg-black/20"></div>
                    <span className="relative px-3 text-md backdrop-blur-3xl">
                        or
                    </span>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:gap-5">
                    <div className="w-full">
                        <p className="text-black">First Name</p>
                        <input
                            type="text"
                            placeholder="demo"
                            className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2 text-[0.95rem]"
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="w-full">
                        <p className="text-black">Last Name</p>
                        <input
                            type="text"
                            placeholder="user"
                            className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2 text-[0.95rem]"
                            onChange={(e) => setSurname(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:gap-5">
                    <div className="w-full">
                        <p className="text-black">Email</p>
                        <input
                            type="email"
                            placeholder="demo@gmail.com"
                            className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2 text-[0.95rem]"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="w-full">
                        <p className="text-black">Phone number</p>
                        <input
                            type="tel"
                            placeholder="+00 00000 00000"
                            className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2 text-[0.95rem]"
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <p className="text-black mt-2">Set a password</p>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter a password"
                        className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2 text-[0.95rem] pr-10"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </span>
                </div>

                <p className="text-black">Confirm your password</p>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2 text-[0.95rem] pr-10"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </span>
                </div>

                <button disabled={loading} className={`w-full mt-5 flex items-center justify-center cursor-pointer h-10 rounded-lg text-white transiton-all duration-200 group ${loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"}`}onClick={handleRegister}>
                    {loading ? "Creating.." : "Create account"}
                    <ArrowRight className="h-4 text-white transition-all duration-200 group-hover:translate-x-1"/>
                </button>

                <p className="text-[0.9rem] mt-4 text-blue-400 flex justify-between">
                    Already have an account?
                    <span className="underline text-blue-400 cursor-pointer" onClick={() => router.push("/auth/login")}>
                        Log in
                    </span>
                </p>
            </div>

            <div className="w-full md:w-[70%] flex items-center justify-center bg-[#1f80ff]">
                <img src="/vector.png" alt="" className="h-80" />
            </div>
        </div>
    );
}