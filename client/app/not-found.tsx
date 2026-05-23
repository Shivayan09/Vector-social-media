"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-background text-foreground p-6 overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 0.9, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [0.9, 1.1, 1, 0.9],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center -mt-16">
        {/* Vector Logo */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="font-serif text-5xl md:text-7xl font-extrabold tracking-tight text-primary">
            Vector
          </h1>
        </motion.div>

        <motion.div 
          className="text-center max-w-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-8xl md:text-9xl font-black text-foreground/80 mb-4 tracking-tighter">
            404
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold mb-6">
            Page Not Found
          </h3>
          <p className="text-muted-foreground mb-10 text-lg">
            Oops! It seems like the page you are looking for has drifted into the void. 
            Let&apos;s get you back to familiar territory.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/main" 
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors duration-300"
            >
              <Home size={20} />
              Back to Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary/10 hover:bg-secondary/20 text-foreground border border-border rounded-lg font-medium transition-colors duration-300 cursor-pointer"
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
