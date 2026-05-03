import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Guidelines | Vector",
  description:
    "Read Vector's terms, community guidelines, chat rules, and restrictions on illegal activity.",
};

const keyRules = [
  "Post only content you have the right to share and that fits respectful community discussion.",
  "Do not use Vector to publish, promote, request, or coordinate illegal activity of any kind.",
  "Private chats must follow the same safety standards as public posts, comments, and profiles.",
  "Harassment, hate, threats, scams, impersonation, and sexually exploitative content are prohibited.",
];

const guidelineSections = [
  {
    title: "Using Vector",
    points: [
      "Vector is a context-based social media platform for sharing posts, comments, profiles, and direct messages.",
      "By creating an account or using the platform, you agree to follow these terms and all applicable laws.",
      "You are responsible for activity that happens through your account and for keeping your login details secure.",
    ],
  },
  {
    title: "Community Guidelines",
    points: [
      "Keep conversations constructive. Debate ideas, but do not target people with abuse, intimidation, or repeated unwanted contact.",
      "Avoid misleading or manipulated content that could reasonably harm users, communities, or public trust.",
      "Respect privacy. Do not share someone else's private, sensitive, or identifying information without clear permission.",
    ],
  },
  {
    title: "Illegal Content And Activity",
    points: [
      "Illegal postings are strictly forbidden, including content involving fraud, trafficking, child sexual abuse material, terrorism, violent criminal activity, or unlawful sale of regulated goods and services.",
      "You may not use posts, comments, usernames, profiles, or chats to plan, encourage, admit, advertise, or facilitate illegal acts.",
      "Any attempt to use Vector for phishing, malware distribution, identity theft, financial scams, or stolen data exchange is prohibited.",
    ],
  },
  {
    title: "Chat And Messaging Rules",
    points: [
      "Direct messages are for lawful, respectful communication only and are subject to the same platform rules as public spaces.",
      "Do not send threats, extortion attempts, sexual harassment, spam, illegal offers, or repeated unwanted messages.",
      "Deleting a chat from your view does not guarantee immediate removal from backups, reports, or moderation records.",
    ],
  },
  {
    title: "Content Ownership And License",
    points: [
      "You keep ownership of the content you create, but you give Vector permission to host, store, display, and distribute it as needed to operate the service.",
      "You must not upload content that infringes copyrights, trademarks, privacy rights, or other legal rights.",
      "We may remove or restrict content if we believe it violates these terms, user safety standards, or the law.",
    ],
  },
  {
    title: "Moderation, Reports, And Enforcement",
    points: [
      "Vector may review reported content, accounts, and chats to investigate safety issues, abuse, or legal violations.",
      "If you violate these rules, we may remove content, limit features, suspend chats, restrict reach, or terminate your account without prior notice.",
      "We may preserve and disclose relevant information where required by law, legal process, or urgent safety needs.",
    ],
  },
  {
    title: "Account Eligibility And Availability",
    points: [
      "Use the platform only if you can legally enter into these terms in your jurisdiction.",
      "We may update, pause, or discontinue features at any time to improve the service, protect users, or comply with legal obligations.",
      "Continued use of Vector after updates to these terms means you accept the revised version.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="page-scroll">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 md:px-8 md:py-12">
        <div className="glass-surface-strong rounded-[2rem] border px-6 py-8 md:px-10 md:py-12">
          <div className="mb-8 flex flex-col gap-4 border-b border-border pb-8">
            <Link
              href="/auth/login"
              className="w-fit text-sm font-medium text-primary underline underline-offset-4"
            >
              Back to login
            </Link>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
                Vector Terms & Guidelines
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                Rules for posting, chatting, and participating on Vector
              </h1>
              <p className="max-w-3xl text-base leading-7 surface-text-muted md:text-lg">
                This page explains the standards for using Vector responsibly.
                It includes our terms of use, community guidelines, and clear
                restrictions on illegal posts, illegal chat activity, abuse,
                and other unsafe behavior.
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2">
            {keyRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-border/70 bg-card/60 p-4 text-sm leading-6 text-foreground"
              >
                {rule}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {guidelineSections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-border/70 bg-card/50 p-5 md:p-6"
              >
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.points.map((point) => (
                    <p
                      key={point}
                      className="text-sm leading-7 text-foreground/90 md:text-base"
                    >
                      {point}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-red-300/40 bg-red-500/8 p-5">
            <h2 className="text-lg font-semibold text-foreground">
              Zero-tolerance note
            </h2>
            <p className="mt-2 text-sm leading-7 text-foreground/90 md:text-base">
              Vector has zero tolerance for illegal content, criminal
              coordination, child exploitation, credible violent threats,
              non-consensual sexual content, and financial or identity-based
              fraud. Content or chats involving these categories may be removed
              immediately and can lead to account termination and reporting to
              the appropriate authorities when required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
