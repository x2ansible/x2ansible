"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Rocket, Sparkles, Wrench, Server } from "lucide-react";

// ---- Workflows definition ----
const workflows = [
  {
    key: "x2ansible",
    title: "x2Ansible (Pro)",
    description:
      "Transform Chef, Puppet, or Shell scripts into production-grade Ansible Playbooks with expert guidance, best practices, and collaborative AI support.",
    icon: <Rocket className="w-10 h-10 text-blue-400 drop-shadow-glow" />,
    cardColor: "from-blue-900/80 to-blue-700/60 border-blue-400/50 shadow-blue-600/30",
    buttonColor: "from-blue-500 via-cyan-500 to-sky-500",
    comingSoon: false,
  },
  {
    key: "newbie",
    title: "Ansible Newbie (Guided)",
    description:
      "Learn Ansible playbooks step by step—get context, explanations, and tips from real experts as you build, not just from AI.",
    icon: <Sparkles className="w-10 h-10 text-cyan-400 drop-shadow-glow" />,
    cardColor: "from-cyan-900/80 to-cyan-700/60 border-cyan-400/50 shadow-cyan-500/30",
    buttonColor: "from-cyan-500 via-blue-500 to-sky-400",
    comingSoon: true,
    soonContent: (
      <>
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon: Ansible Newbie (Guided)</h2>
        <p className="text-slate-300 text-center mb-4">
          This workflow will walk you through Ansible basics step by step, combining friendly explanations and community wisdom—never just automation for its own sake!
        </p>
      </>
    ),
  },
  {
    key: "automation-architect",
    title: "Automation Architect",
    description:
      "Design and visualize complex workflows. Collaborate with team members, plan dependencies, and simulate results—AI as a partner, not a replacement.",
    icon: <Wrench className="w-10 h-10 text-emerald-400 drop-shadow-glow" />,
    cardColor: "from-green-900/80 to-green-700/60 border-emerald-400/50 shadow-emerald-500/30",
    buttonColor: "from-emerald-500 via-green-500 to-cyan-400",
    comingSoon: true,
    soonContent: (
      <>
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon: Automation Architect</h2>
        <p className="text-slate-300 text-center mb-4">
          Collaboratively design and test automation with human expertise and transparent, trustworthy AI suggestions.
        </p>
      </>
    ),
  },
  {
    key: "ansible-ops",
    title: "Ansible Ops",
    description:
      "Operate, monitor, and troubleshoot live Ansible environments with smart diagnostics and human-in-the-loop recommendations.",
    icon: <Server className="w-10 h-10 text-orange-400 drop-shadow-glow" />,
    cardColor: "from-orange-900/80 to-orange-700/60 border-orange-400/50 shadow-orange-500/30",
    buttonColor: "from-orange-500 via-yellow-500 to-amber-400",
    comingSoon: true,
    soonContent: (
      <>
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon: Ansible Ops</h2>
        <p className="text-slate-300 text-center mb-4">
          Stay in control—get actionable insights and collaborative troubleshooting for your Ansible ops, with AI that supports, not replaces, your expertise.
        </p>
      </>
    ),
  },
];

export default function Page() {
  const { status } = useSession();
  const router = useRouter();
  const [pendingWorkflow, setPendingWorkflow] = useState<string | null>(null);
  const [comingSoonWorkflow, setComingSoonWorkflow] = useState<string | null>(null);

  function tryWorkflow(key: string) {
    const wf = workflows.find(w => w.key === key);
    if (wf?.comingSoon) {
      setComingSoonWorkflow(key);
      return;
    }
    // Require sign-in for ALL workflows:
    if (status === "authenticated") {
      router.push(`/run?workflow=${key}`);
    } else {
      setPendingWorkflow(key);
    }
  }

  function closeModal() {
    setPendingWorkflow(null);
    setComingSoonWorkflow(null);
  }

  function handleSignIn() {
    if (!pendingWorkflow) return;
    signIn("github", { callbackUrl: `/run?workflow=${pendingWorkflow}` });
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#151826] via-[#181f2e] to-[#10121b] overflow-x-hidden">
      {/* Floating background orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-10 w-80 h-80 bg-gradient-to-tr from-blue-600/30 via-cyan-500/20 to-pink-400/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute right-1/4 bottom-0 w-96 h-96 bg-gradient-to-br from-indigo-400/30 via-purple-400/20 to-blue-400/20 rounded-full blur-3xl animate-float-slower" />
      </div>
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-10 px-2 pt-10 pb-12">
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-black text-center bg-gradient-to-r from-blue-400 via-fuchsia-400 to-cyan-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-wave mb-2 tracking-tight drop-shadow-md">
          Agentic Workflows
        </h1>
        {/* Marquee Subtitle */}
        <div
          className="w-full flex justify-center mt-1 mb-7 select-none"
          style={{ minHeight: '2.7em', position: "relative", overflow: "hidden" }}
        >
          <div
            className={`
              whitespace-nowrap text-lg md:text-xl text-slate-300 font-medium max-w-2xl
              opacity-0 animate-subtitle-fadein
              subtitle-marquee
            `}
            style={{
              animation: "subtitle-fadein 1.2s cubic-bezier(.61,0,.44,1) forwards, marquee-scroll 19s linear 1.2s infinite"
            }}
            tabIndex={-1}
          >
            Agentic automation—where your decisions guide every step.
            <span className="mx-2" />
            Pick a workflow and stay in control—AI supports, you decide.
          </div>
        </div>
        {/* Responsive, compact cards grid */}
        <div
          className="w-full grid gap-6 sm:gap-7 md:gap-8"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            display: 'grid'
          }}
        >
          {workflows.map((wf, idx) => (
            <div
              key={wf.key}
              className={`
                relative group bg-gradient-to-br ${wf.cardColor} border backdrop-blur-lg rounded-2xl shadow-xl px-5 py-7 sm:px-6 sm:py-8 md:px-7 md:py-9 flex flex-col items-center text-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-up
                ${wf.comingSoon ? "cursor-not-allowed opacity-80" : "cursor-pointer"}
                min-h-[270px] max-w-full
                card-even-height
              `}
              style={{ animationDelay: `${idx * 0.08 + 0.08}s` }}
              tabIndex={0}
              role="button"
              aria-label={`Try ${wf.title}`}
              onClick={() => tryWorkflow(wf.key)}
              onKeyDown={(e) => (e.key === "Enter" ? tryWorkflow(wf.key) : undefined)}
            >
              <div className="mb-2 group-hover:scale-110 group-hover:-translate-y-1.5 transition-transform duration-300">
                {wf.icon}
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-white mb-1 tracking-tight">
                {wf.title}
              </h2>
              <p className="text-slate-200 text-[15px] md:text-base font-medium mb-1 max-w-xs mx-auto opacity-90">
                {wf.description}
              </p>
              {/* Spacer to push button to the bottom */}
              <div className="flex-1" />
              <button
                onClick={e => { e.stopPropagation(); tryWorkflow(wf.key); }}
                className={`mt-3 px-5 py-2 text-[15px] md:text-base font-bold rounded-lg bg-gradient-to-r ${wf.buttonColor} shadow ring-1 ring-white/10 hover:shadow-lg hover:brightness-110 hover:scale-105 transition-all duration-200 text-white focus:outline-none focus:ring-4 focus:ring-blue-300 w-full`}
                disabled={wf.comingSoon}
                style={{ minHeight: 44 }}
              >
                🚀 Try This Workflow
              </button>
              <div className={`pointer-events-none absolute inset-0 rounded-2xl group-hover:opacity-40 opacity-20 group-hover:scale-110 scale-100 transition-all duration-300 group-hover:blur-xl bg-gradient-to-br ${wf.cardColor}`} />
              {wf.comingSoon && (
                <span className="absolute top-3 right-3 text-xs bg-slate-700/80 text-slate-100 px-2 py-1 rounded-full shadow">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Sign-in Modal */}
      {pendingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-700/80 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center animate-fade-in">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
              onClick={closeModal}
              aria-label="Close"
            >
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
            <div className="mb-3">{workflows.find((w) => w.key === pendingWorkflow)?.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Sign in to continue
            </h2>
            <p className="text-slate-300 mb-6 text-center">
              Please sign in with GitHub to use the <span className="font-semibold text-blue-300">{workflows.find((w) => w.key === pendingWorkflow)?.title}</span> workflow.
            </p>
            <button
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-800 to-slate-700 border border-slate-600 rounded-xl font-semibold text-white text-lg shadow hover:bg-slate-800 transition mb-2"
              onClick={handleSignIn}
              autoFocus
            >
              <svg width="22" height="22" fill="currentColor" className="mr-2" viewBox="0 0 24 24"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.2-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6-1 2-1.4.1-.7.4-1 .7-1.2-2.7-.3-5.5-1.3-5.5-5.7 0-1.2.5-2.2 1.1-3-.1-.2-.4-1.3.1-2.7 0 0 .9-.3 3 .9.8-.2 1.7-.4 2.6-.4.9 0 1.8.1 2.6.4 2.1-1.2 3-.9 3-.9.5 1.4.2 2.5.1 2.7.6.8 1.1 1.8 1.1 3 0 4.4-2.8 5.3-5.5 5.6.4.3.8 1 .8 2v3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" /></svg>
              Sign in with GitHub
            </button>
            <button
              className="mt-1 px-4 py-1 bg-transparent text-slate-400 hover:text-white text-sm underline"
              onClick={closeModal}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Coming Soon Modal */}
      {comingSoonWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-700/80 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center animate-fade-in">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
              onClick={closeModal}
              aria-label="Close"
            >
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
            <div className="mb-3">{workflows.find((w) => w.key === comingSoonWorkflow)?.icon}</div>
            {workflows.find((w) => w.key === comingSoonWorkflow)?.soonContent ?? (
              <>
                <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
                <p className="text-slate-300 text-center mb-4">This workflow is in development. Check back soon!</p>
              </>
            )}
            <button
              className="mt-2 px-4 py-1 bg-transparent text-slate-400 hover:text-white text-sm underline"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Animations and styles */}
      <style jsx global>{`
        @keyframes gradient-wave {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-wave {
          animation: gradient-wave 5s ease-in-out infinite;
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 14px #38bdf8aa);
        }
        .animate-fade-up {
          animation: fadeUp 0.7s cubic-bezier(.39,.58,.57,1) both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .animate-float-slow {
          animation: floatOrb 14s ease-in-out infinite alternate;
        }
        .animate-float-slower {
          animation: floatOrb 22s ease-in-out infinite alternate;
        }
        @keyframes floatOrb {
          0% { transform: translateY(0) scale(1);}
          100% { transform: translateY(-40px) scale(1.08);}
        }
        .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.4,0,0.2,1);}
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
        .group:focus-within { box-shadow: 0 0 0 4px #38bdf880; }

        @keyframes subtitle-fadein {
          to { opacity: 1; }
        }
        @keyframes marquee-scroll {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-110%); }
        }
        .subtitle-marquee:hover {
          animation-play-state: paused !important;
          cursor: pointer;
        }
        /* Fix all cards to same height for button alignment */
        .card-even-height {
          display: flex;
          flex-direction: column;
          min-height: 330px; /* You can tweak for more/less height */
          height: 100%;
        }
      `}</style>
    </main>
  );
}
