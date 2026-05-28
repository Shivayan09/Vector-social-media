"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState } from "react";
import SupportModal from "@/components/modals/SupportModal";

export default function SupportPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  return (
    <div className="page-scroll">
      <Navbar />

      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 md:px-8 md:py-12">
        <div className="glass-surface-strong rounded-[2rem] border px-6 py-8 md:px-10 md:py-12">
          <div className="mb-8 flex flex-col gap-4 border-b border-border pb-8">
            <Link
              href="/main"
              className="w-fit text-sm font-medium text-primary underline underline-offset-4"
            >
              Back to home
            </Link>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
                Help Center
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                How can we help?
              </h1>
              <p className="max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">
                Browse the topics below or reach out to us directly. We are here to help you get the most out of Vector.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div 
              onClick={() => setSelectedTopic("Account Issues")}
              className="rounded-xl border border-border p-6 space-y-2 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-md active:opacity-60"
            >
              <h2 className="text-lg font-semibold text-foreground">Account Issues</h2>
              <p className="text-sm text-foreground/70">Having trouble logging in or managing your account? We can help you get back on track.</p>
            </div>

            <div 
              onClick={() => setSelectedTopic("Report a Bug")}
              className="rounded-xl border border-border p-6 space-y-2 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-md active:opacity-60"
            >
              <h2 className="text-lg font-semibold text-foreground">Report a Bug</h2>
              <p className="text-sm text-foreground/70">Found something that does not look right? Let us know and we will fix it as soon as possible.</p>
            </div>

            <div 
              onClick={() => setSelectedTopic("Privacy & Safety")}
              className="rounded-xl border border-border p-6 space-y-2 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-md active:opacity-60"
            >
              <h2 className="text-lg font-semibold text-foreground">Privacy & Safety</h2>
              <p className="text-sm text-foreground/70">Questions about your data or how to stay safe on Vector? Find answers here.</p>
            </div>

            <div 
              onClick={() => setSelectedTopic("Contact Us")}
              className="rounded-xl border border-border p-6 space-y-2 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-md active:opacity-60"
            >
              <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
              <p className="text-sm text-foreground/70">Still need help? Send us a message and we will get back to you.</p>
            </div>
          </div>

        </div>
      </div>

      <SupportModal 
        open={!!selectedTopic} 
        onClose={() => setSelectedTopic(null)} 
        topic={selectedTopic || ""} 
      />
    </div>
  );
}