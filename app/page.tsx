/// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Upload, Sliders, Zap, ShieldCheck, Brain, Heart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold">
              BZ
            </div>
            <span className="font-semibold text-slate-900">Blue Zone</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 text-xs uppercase tracking-wider">
            Health Intelligence
          </Badge>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Live younger.{" "}
            <span className="text-primary">Feel it in your biomarkers.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your blood tests, WHOOP, or Apple Health data. Set a target
            age. Blue Zone builds your personalized longevity protocol —
            supplements, nutrition, and lifestyle, ranked by evidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="gap-2 px-8 h-12 text-base">
                Get started free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="h-12 text-base px-8">
                See how it works
              </Button>
            </a>
          </div>
        </div>

        {/* Hero visual */}
        <div className="mx-auto max-w-3xl mt-20">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 h-6 rounded-md bg-white/70 border border-slate-200 flex items-center px-3">
                <span className="text-xs text-slate-400">bluezone.app/app/results/...</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Target age", value: "31", color: "text-primary" },
                { label: "Supplements", value: "7", color: "text-emerald-600" },
                { label: "Clinics nearby", value: "4", color: "text-violet-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { title: "Magnesium Glycinate", tags: ["sleep", "stress"] },
                { title: "Vitamin D3 + K2", tags: ["immune", "bone"] },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{item.title}</div>
                    <div className="flex gap-1 mt-1">
                      {item.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Three steps to your protocol
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              From raw data to personalized longevity protocol in minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", Icon: Upload, title: "Upload your data", desc: "Drop in blood test PDFs, Apple Health exports, or connect your WHOOP. We extract every biomarker automatically." },
              { step: "02", Icon: Sliders, title: "Set your target age", desc: "Dial in how young you want to feel — from 23 to 60. Tell us your goals: sleep, strength, focus, longevity." },
              { step: "03", Icon: Zap, title: "Get your protocol", desc: "Receive evidence-ranked supplements, nutrition, home biohacking tools, and nearby specialist clinics." },
            ].map(({ step, Icon, title, desc }) => (
              <div key={step} className="relative bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="text-6xl font-black text-slate-100 absolute top-6 right-6 leading-none select-none">{step}</div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-16 px-6 border-y border-slate-100">
        <div className="mx-auto max-w-4xl">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { Icon: ShieldCheck, title: "Privacy first", desc: "Your health data never leaves your account. No selling, no sharing with third parties." },
              { Icon: Brain, title: "Evidence-based", desc: "Every recommendation references peer-reviewed research, not influencer trends." },
              { Icon: Heart, title: "Not medical advice", desc: "Educational insights to guide conversations with your healthcare provider." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="font-semibold text-slate-800 text-sm">{title}</div>
                <p className="text-slate-500 text-xs leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-slate-900 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start your longevity protocol today</h2>
          <p className="text-slate-400 mb-8 text-lg">Sign in with Google or email — no password required.</p>
          <Link href="/auth/signin">
            <Button size="lg" className="gap-2 px-10 h-12 text-base">
              Get started free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white text-[9px] font-bold">BZ</div>
            <span className="text-sm font-medium text-slate-700">Blue Zone</span>
          </div>
          <p className="text-xs text-slate-400 text-center max-w-lg">
            Blue Zone is not a medical service. All insights are for informational and educational purposes only and do not constitute medical advice. Always consult a qualified healthcare professional before making changes to your health regimen.
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <a href="/terms" className="hover:text-slate-700">Terms</a>
            <a href="/privacy" className="hover:text-slate-700">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
