import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { ResumeTemplate } from "@/components/resume/ResumeTemplate";
import { demoResumeData } from "@/utils/demoData";
import { Download, LucideIcon, Puzzle, Target, Zap } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  border: string;
  iconBg: string;
};

const features: Feature[] = [
  {
    icon: Zap,
    title: "Live Resume Preview",
    description: "See your resume update in real time as you type. No more guess-and-check.",
    color: "from-amber-50 to-orange-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100",
  },
  {
    icon: Target,
    title: "ATS Optimized",
    description: "Templates designed to pass Applicant Tracking Systems at top companies.",
    color: "from-emerald-50 to-teal-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
  },
  {
    icon: Puzzle,
    title: "Section Builder",
    description: "Drag, add, and reorder sections with our intuitive visual editor.",
    color: "from-indigo-50 to-indigo-50",
    border: "border-indigo-100",
    iconBg: "bg-indigo-100",
  },
  {
    icon: Download,
    title: "Instant PDF Download",
    description: "Export a pixel-perfect PDF ready to send to any recruiter.",
    color: "from-violet-50 to-purple-50",
    border: "border-violet-100",
    iconBg: "bg-violet-100",
  },
];

const steps = [
  {
    step: "01",
    title: "Enter your information",
    description: "Fill in your personal details, education, experience, and projects using our clean form editor.",
  },
  {
    step: "02",
    title: "Watch it build live",
    description: "Your resume renders instantly as you type. Adjust, refine, and perfect it in real time.",
  },
  {
    step: "03",
    title: "Download your resume",
    description: "Unlock your resume with a one-time payment and download a professional PDF instantly.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative md:h-screen pt-20 md:pt-0 flex items-center px-6 overflow-hidden">
        {/* <div className="absolute inset-0 overflow-hidden hidden md:flex pointer-events-none">
          <div className="absolute top-20 right-0 w-[700px] h-[500px] rounded-full bg-blue-300/50 blur-3xl" />
        </div> */}  

        <div className="flex flex-col md:flex-row gap-10 md:gap-0 relative">
          <div className="md:px-10 text-center md:text-left w-full md:w-[50%]">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-6 animate-fade-in-up stagger-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Free to build · Unlock to download
            </div>

            <h1 className="text-4xl md:text-[3.6rem] font-bold text-neutral-900 leading-[1.1] tracking-tight mb-5 animate-fade-in-up stagger-2">
              Build ATS-friendly resumes{" "}
              <span className="bg-blue-500 bg-clip-text text-transparent">
                in minutes
              </span>
            </h1>

            <p className="text-lg text-neutral-500 leading-relaxed mb-8 animate-fade-in-up stagger-3">
              ResumeForge is a modern resume builder with live preview, clean templates,
              and one-click PDF export — designed for developers and professionals.
            </p>

            <div className="flex flex-col justify-center md:justify-start sm:flex-row gap-3 animate-fade-in-up stagger-4">
              <Link href="/builder" className="btn-primary text-sm flex justify-center py-3 px-6">
                Create Resume →
              </Link>
              <Link href="#preview" className="btn-secondary text-sm flex justify-center py-3 px-6">
                View Demo
              </Link>
            </div>
            <div className="flex items-center gap-4 mt-8 animate-fade-in-up stagger-5">
              <div className="flex -space-x-2">
                {["bg-blue-200", "bg-blue-200", "bg-blue-200", "bg-blue-200"].map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white`} />
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                <span className="font-semibold text-neutral-700">2,400+</span> resumes built this month
              </p>
            </div>
          </div>

          <div className="relative my-auto animate-fade-in-up w-full md:w-[50%] pb-10 md:pb-0">
            <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden shadow-card">
              <div className="bg-neutral-50 border-b border-neutral-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-300/70" />
                  <div className="w-3 h-3 rounded-full bg-green-300/70" />
                </div>
                <div className="mx-auto flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-neutral-200 text-xs text-neutral-400">
                  <span>🔒</span> vector.app/builder
                </div>
              </div>
              <div className="grid grid-cols-5 h-64 md:h-80">
                <div className="col-span-2 border-r border-neutral-100 p-4 overflow-hidden bg-neutral-50/50">
                  <div className="space-y-2">
                    <div className="h-2 bg-neutral-200 rounded-full w-24" />
                    {[100, 80, 90, 70].map((w, i) => (
                      <div key={i} className="h-8 bg-white rounded-lg border border-neutral-100 shadow-sm" style={{ width: `${w}%` }} />
                    ))}
                    <div className="h-2 bg-neutral-200 rounded-full w-20 mt-3" />
                    {[100, 60].map((w, i) => (
                      <div key={i} className="h-8 bg-white rounded-lg border border-neutral-100 shadow-sm" style={{ width: `${w}%` }} />
                    ))}
                    <div className="h-16 bg-white rounded-lg border border-neutral-100 shadow-sm w-full" />
                  </div>
                </div>
                <div className="col-span-3 p-4 overflow-hidden">
                  <div className="scale-[0.45] origin-top-left" style={{ width: "222%", transformOrigin: "top left" }}>
                    <ResumeTemplate data={demoResumeData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-blue-500">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-semibold text-gray-200 tracking-widest uppercase mb-3">Features</p>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
              Everything you need to get hired
            </h2>
            <p className="text-gray-300 text-base">
              Built for modern job seekers who want results, not complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => {
              const Icon = f.icon;

              return (
                <div
                  key={f.title}
                  className={`group rounded-2xl p-6 cursor-pointer bg-white transition-all duration-300`}
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)" }}
                >
                  <div className={`w-10 h-10 group-hover:scale-[1.2] transition-all duration-200 rounded-md bg-blue-500 flex items-center justify-center mb-4`}>
                    <Icon size={20} className="text-white" />
                  </div>

                  <h3 className="font-bold text-blue-600 mb-2 transition-all duration-200 group-hover:text-[1.1rem] group-hover:text-blue-500">{f.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-semibold text-blue-500 tracking-widest uppercase mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-neutral-900 tracking-tight mb-4">
              Three steps to your dream job
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100" />

            {steps.map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <span className="font-bold text-white text-xs tracking-widest">{s.step}</span>
                </div>
                <h3 className="text-[1.2rem] font-bold text-neutral-800 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-xs mx-auto">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESUME PREVIEW ── */}
      <section id="preview" className="py-24 px-6 bg-blue-500">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-semibold text-gray-200 tracking-widest uppercase mb-3">Preview</p>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
              Clean, professional layout
            </h2>
            <p className="text-gray-300 text-base">
              Our ATS-friendly template is optimized for readability and machine parsing alike.
            </p>
          </div>

          <div className="max-w-2xl mx-auto rounded-xl overflow-hidden cursor-pointer">
            <ResumeTemplate data={demoResumeData} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight mb-5">
            Start building
            <span className="bg-blue-500 bg-clip-text text-transparent"> now!</span>
          </h2>
          <p className="text-neutral-500 text-base mb-8 max-w-md mx-auto">
            Join thousands of professionals who landed their dream job with ResumeForge. Free to build, pay to download.
          </p>
          <Link href="/builder" className="btn-primary text-base py-3.5 px-8">
            Create Resume — It&apos;s Free →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
