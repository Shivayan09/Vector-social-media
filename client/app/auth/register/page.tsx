"use client";

import RegistrationForm from "@/components/forms/RegistrationForm";
import { MessageSquare, Users, Bell } from "lucide-react";

const features = [
    {
        icon: MessageSquare,
        title: "Real-time Discussions",
        styles:
            "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
        icon: Users,
        title: "Connect with Builders",
        styles:
            "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
        icon: Bell,
        title: "Instant Notifications",
        styles:
            "border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-400",
    },
];

export default function Register() {
    return (
        <div className="flex h-[100dvh] w-full flex-col lg:flex-row bg-background text-foreground overflow-hidden">

            {/* Left Branding (Desktop) */}
            <div className="hidden lg:flex w-1/2 h-full flex-col overflow-y-auto border-r border-border bg-background px-16 py-10">
                <div className="flex flex-col justify-center min-h-full w-full max-w-2xl mx-auto">
                    <h1 className="text-7xl font-bold tracking-tight">
                        Vector
                    </h1>

                    <p className="mt-6 text-xl leading-relaxed text-muted-foreground max-w-xl">
                        Connect with developers, creators, and builders through meaningful
                        discussions and collaboration.
                    </p>

                    <div className="flex flex-wrap gap-4 mt-10">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-105 ${feature.styles}`}
                            >
                                <feature.icon className="w-4 h-4" />
                                <span>{feature.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Form (Mobile & Desktop) */}
            <div className="flex-1 h-full overflow-y-auto bg-background">
                {/* FIX: Changed to `justify-start` for mobile to prevent top-clipping. 
                  Retained `lg:justify-center` for desktop. 
                  Added `py-10` so it always has safe breathing room at the top and bottom. 
                */}
                <div className="flex flex-col min-h-full justify-start lg:justify-center px-4 py-10 sm:px-6 lg:px-12">
                    <div className="w-full max-w-md mx-auto">

                        {/* Mobile Branding */}
                        <div className="lg:hidden text-center mb-8 w-full">
                            {/* FIX: Reduced text size from text-5xl to text-4xl on mobile */}
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                                Vector
                            </h1>

                            <p className="mt-3 text-muted-foreground text-sm">
                                Connect. Share. Build together.
                            </p>

                            <div className="flex flex-wrap justify-center gap-3 mt-6">
                                {features.map((feature) => (
                                    <div
                                        key={feature.title}
                                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${feature.styles}`}
                                    >
                                        <feature.icon className="w-3.5 h-3.5" />
                                        <span>{feature.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Registration Form */}
                        <div className="w-full flex justify-center">
                            <RegistrationForm />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}