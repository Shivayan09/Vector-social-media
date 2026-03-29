"use client";

import { useState } from "react";
import axios from "axios";
import Navbar from "@/components/ui/Navbar";
import { toast } from "react-toastify";

export default function ResumeAnalyzer() {
    const [file, setFile] = useState<File | null>(null);
    const [jd, setJd] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleSubmit = async () => {
        if(!file) {
            return toast.warn("Upload your resume")
        }
        if(!jd) {
            return toast.warn("Write a job description")
        }
        if(jd.length<10) {
            return toast.warn("Job description must be of min 10 words")
        }

        const formData = new FormData();
        formData.append("resume", file);
        formData.append("jobDescription", jd);

        try {
            setLoading(true);
            setResult(null); // 💥 FIX: remove old result immediately
            setStep(1);

            setTimeout(() => setStep(2), 1200);

            const res = await axios.post(BACKEND_URL + "/api/resume/analyze", formData);

            setResult(res.data);
        } catch (err: any) {
            console.error(err);
            alert("Backend error");
        } finally {
            setLoading(false);
            setStep(0);
        }
    };

    return (
        <div className="min-h-screen py-5 bg-white relative overflow-hidden">
            <Navbar />

            <div className="relative flex z-10 max-w-7xl mx-auto px-6 py-16">
                <div className="flex flex-col md:flex-row gap-10 w-full">

                    {/* INPUT SIDE */}
                    <div className="space-y-5 w-full md:w-1/2">

                        <div>
                            <h1 className="text-5xl font-bold tracking-tight text-neutral-900">
                                Resume <span className="text-blue-500">Intelligence</span>
                            </h1>
                            <p className="text-neutral-500 mt-3 max-w-xl">
                                Upload your resume. Paste a job description. Get brutally honest insights.
                            </p>
                        </div>

                        {/* Upload */}
                        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-card">
                            <p className="text-sm text-neutral-500 mb-3">Resume</p>

                            <div className="border border-dashed border-neutral-300 rounded-xl py-2 text-center hover:border-blue-400 transition cursor-pointer bg-neutral-50">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) =>
                                        setFile(e.target.files?.[0] || null)
                                    }
                                    className="hidden"
                                    id="file-upload"
                                />

                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <p className="text-sm text-neutral-600">
                                        {file ? file.name : "Click to upload PDF"}
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* JD */}
                        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-card">
                            <p className="text-sm text-neutral-500 mb-3">
                                Job Description
                            </p>

                            <textarea
                                value={jd}
                                onChange={(e) => setJd(e.target.value)}
                                placeholder="Paste the job description..."
                                className="w-full h-36 border border-neutral-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 resize-none"
                            />
                        </div>

                        {/* BUTTON */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`w-full py-3 rounded-xl ${
                                loading
                                    ? "bg-blue-400 cursor-not-allowed"
                                    : "bg-blue-500 hover:bg-blue-600"
                            } text-white font-medium transition shadow-md`}
                        >
                            {loading ? "Analyzing..." : "Analyze Resume"}
                        </button>
                    </div>

                    {/* OUTPUT SIDE */}
                    <div className="w-full md:w-1/2">

                        {/* 🧠 SINGLE RENDER FLOW */}
                        {loading ? (
                            <div className="h-full flex items-center justify-center border border-neutral-200 rounded-2xl bg-white shadow-card p-8">
                                <div className="flex flex-col items-center text-center space-y-6">

                                    {/* Loader */}
                                    <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />

                                    <div>
                                        <p className="text-lg font-semibold text-neutral-800">
                                            Preparing your analysis...
                                        </p>
                                        <p className="text-sm text-neutral-500">
                                            This takes a few seconds
                                        </p>
                                    </div>

                                    {/* Steps */}
                                    <div className="space-y-3 text-left">

                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                                    step >= 1
                                                        ? "bg-green-100 text-green-600"
                                                        : "bg-neutral-200"
                                                }`}
                                            >
                                                {step > 1 ? "✓" : ""}
                                            </div>
                                            <p
                                                className={`${
                                                    step >= 1
                                                        ? "text-green-600"
                                                        : "text-neutral-500"
                                                }`}
                                            >
                                                Parsing your resume
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                                    step >= 2
                                                        ? "bg-green-100 text-green-600"
                                                        : "bg-neutral-200"
                                                }`}
                                            >
                                                {step > 2 ? "✓" : ""}
                                            </div>
                                            <p
                                                className={`${
                                                    step >= 2
                                                        ? "text-blue-600"
                                                        : "text-neutral-500"
                                                }`}
                                            >
                                                Analyzing resume
                                            </p>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        ) : result ? (
                            <div className="space-y-5">

                                {/* SCORE */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
                                    <p className="text-sm text-neutral-500">Alignment Score</p>
                                    <h2 className="text-5xl font-bold text-blue-500 mt-1">
                                        {result.ats_score ?? "N/A"}
                                    </h2>
                                </div>

                                {/* CARDS */}
                                <div className="grid gap-4">

                                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-card">
                                        <h3 className="text-sm text-blue-500 mb-2 font-medium">
                                            Missing Skills
                                        </h3>
                                        <ul className="text-sm text-neutral-600 space-y-1">
                                            {result.missing_skills?.map((s: string, i: number) => (
                                                <li key={i}>• {s}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-card">
                                        <h3 className="text-sm text-blue-500 mb-2 font-medium">
                                            Weak Areas
                                        </h3>
                                        <ul className="text-sm text-neutral-600 space-y-1">
                                            {result.weak_areas?.map((w: string, i: number) => (
                                                <li key={i}>• {w}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-card">
                                        <h3 className="text-sm text-blue-500 mb-2 font-medium">
                                            Suggestions
                                        </h3>
                                        <ul className="text-sm text-neutral-600 space-y-1">
                                            {result.suggestions?.map((s: string, i: number) => (
                                                <li key={i}>• {s}</li>
                                            ))}
                                        </ul>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-neutral-400 text-sm border border-neutral-200 rounded-2xl bg-white shadow-card">
                                Your analysis will appear here
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}