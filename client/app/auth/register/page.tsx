"use client";

import axios from "axios";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, KeyboardEvent, ChangeEvent } from "react";
import { toast } from "react-toastify";

export default function Register() {

    const router = useRouter();

    const [step, setStep] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    const [name, setName] = useState<string>("");
    const [surname, setSurname] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [phoneNumber, setPhone] = useState<string>("");

    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);

    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const nextStep = () => {
        setStep((prev) => prev + 1);
    };

    const prevStep = () => {
        setStep((prev) => prev - 1);
    };

    const handleOtpChange = (value: string, index: number) => {

        if (!/^[0-9]?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;

        setOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
            nextInput?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {

        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
            prevInput?.focus();
        }
    };

    const otpValue = otp.join("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const {data} = await axios.post(BACKEND_URL + '/api/auth/register', {name, surname, email, phoneNumber, password}, {withCredentials: true});
            if(data.success) {
                toast.success("Registered successfully");
                router.push('/');
                return;
            } else {
                toast.warn(data.message);
            }
        } catch(error: any) {
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
    };

    return (
        <div className="flex h-screen">

            <div className="w-full md:w-[30%] p-7">

                <p className="text-blue-500 text-[1.5rem] font-semibold">Welcome to Vector</p>
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

                {step === 1 && (
                    <>
                        <div className="flex flex-col">

                            <div className="w-full">
                                <p>First Name</p>
                                <input
                                    type="text"
                                    placeholder="demo"
                                    className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                />
                            </div>

                            <div className="w-full">
                                <p>Last Name</p>
                                <input
                                    type="text"
                                    placeholder="user"
                                    className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSurname(e.target.value)}
                                />
                            </div>

                            <div className="w-full">
                                <p>Email</p>
                                <input
                                    type="email"
                                    placeholder="demo@gmail.com"
                                    className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="w-full">
                                <p>Phone number</p>
                                <input
                                    type="tel"
                                    placeholder="+00 00000 00000"
                                    className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 my-2"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                                />
                            </div>

                        </div>

                        <button className="w-full mt-5 bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-lg" onClick={nextStep}>
                            Continue
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="mt-4">Enter OTP</p>

                        <div className="flex gap-2 mt-3 justify-between">

                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    value={digit}
                                    maxLength={1}
                                    className="w-12 h-12 text-center text-lg font-semibold rounded-md bg-blue-500/5 outline-none"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                        handleOtpChange(e.target.value, index)
                                    }
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                />
                            ))}

                        </div>

                        <div className="flex gap-3 mt-6">

                            <button className="w-full border h-10 rounded-lg" onClick={prevStep}>
                                Back
                            </button>

                            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-lg" onClick={nextStep}>
                                Verify OTP
                            </button>

                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <p className="mt-2">Set a password</p>

                        <div className="relative">

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter a password"
                                className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 pr-10 my-2"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}/>

                            <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </span>

                        </div>

                        <p>Confirm your password</p>

                        <div className="relative">

                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                className="outline-none h-10 bg-blue-500/5 w-full rounded-md p-3 pr-10 my-2"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}/>

                            <span
                                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </span>

                        </div>

                        <button
                            disabled={loading}
                            className={`w-full mt-5 flex items-center justify-center gap-2 h-10 rounded-lg text-white transition-all duration-200 group ${loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"}`}
                            onClick={handleRegister}>
                            {loading ? "Creating.." : "Create account"}

                            <ArrowRight className="h-4 transition-all duration-200 group-hover:translate-x-1" />

                        </button>

                        <button className="w-full border h-10 rounded-lg mt-3" onClick={prevStep}>
                            Back
                        </button>
                    </>
                )}

                <p className="text-[0.9rem] mt-4 text-blue-400 flex justify-between">
                    Already have an account?
                    <span
                        className="underline cursor-pointer"
                        onClick={() => router.push("/auth/login")}
                    >
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