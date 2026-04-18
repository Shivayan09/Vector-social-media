"use client";

import LoginForm from "@/components/forms/LoginForm";
import { useAppContext } from "@/context/AppContext"; // ✅ add

export default function Login() {
  const { setLoading } = useAppContext(); // ✅ add

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <LoginForm />

      
    </div>
  );
}