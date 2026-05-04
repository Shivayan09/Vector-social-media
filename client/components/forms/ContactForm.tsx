"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "../ui/button";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${BACKEND_URL}/api/contact`,
        formData
      );

      if (data.success) {
        toast.success("Message sent successfully!");
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your name"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="subject" className="text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="How can we help?"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Your message..."
          rows={5}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
