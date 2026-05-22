"use client";

import LoginForm from "@/components/forms/LoginForm";
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

export default function Login() {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">

      {/* Left Branding Section */}
      <div className="hidden lg:flex border-r border-border bg-background">
        <div className="flex flex-col justify-center px-16 w-full max-w-2xl">

          <div>
            <h1 className="text-7xl font-bold tracking-tight">
              Vector
            </h1>

            <p className="mt-6 text-xl leading-relaxed text-muted-foreground max-w-xl">
              A social platform for developers, creators, and builders to
              share ideas, collaborate, and grow together.
            </p>

            {/* Desktop Feature Chips */}
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
      </div>

      {/* Right Login Section */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10 bg-background">

        <div className="w-full max-w-md mx-auto">

          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-5xl font-bold tracking-tight">
              Vector
            </h1>

            <p className="mt-3 text-sm text-muted-foreground px-4">
              Connect. Share. Build together.
            </p>

            {/* Mobile Feature Chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-medium ${feature.styles}`}
                >
                  <feature.icon className="w-3 h-3" />
                  <span className="whitespace-nowrap">
                    {feature.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-md px-1 sm:px-0">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}