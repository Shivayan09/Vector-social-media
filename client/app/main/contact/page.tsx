"use client";

import Navbar from "@/components/Navbar";
import ContactForm from "@/components/forms/ContactForm";
import Link from "next/link";

export default function ContactPage() {
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
                Get in Touch
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                Contact Us
              </h1>
              <p className="max-w-3xl text-base leading-7 text-foreground/70 md:text-lg">
                Have a question or feedback? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as quickly as we can.
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
