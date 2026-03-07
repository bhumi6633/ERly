"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { ArrowRight, MapPin, Clock, Stethoscope, Smartphone, Shield, Activity } from "lucide-react";
import { MobileWarningModal } from "@/components/modals/MobileWarningModal";
import { useMobileCheck } from "@/hooks/useMobileCheck";
import { AuthButton } from "@/components/auth-button";

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const },
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: { staggerChildren: 0.1 },
  },
  viewport: { once: true },
};

const STEPS = [
  {
    num: "01",
    title: "Describe Your Symptoms",
    desc: "Tell us what you're experiencing. Our system understands natural language — just type like you would tell a friend.",
    icon: <Activity className="w-6 h-6" />,
  },
  {
    num: "02",
    title: "Get Triage Assessment",
    desc: "Receive an instant urgency evaluation and a recommended care type based on your symptoms.",
    icon: <Stethoscope className="w-6 h-6" />,
  },
  {
    num: "03",
    title: "Find the Right Care",
    desc: "See nearby facilities on the map with wait times, directions, and contact info. Get the care you need.",
    icon: <MapPin className="w-6 h-6" />,
  },
];

const FEATURES = [
  {
    title: "Smart Triage",
    desc: "AI-powered symptom evaluation helps route you to the right level of care — ER, urgent care, walk-in, or self-care.",
    icon: <Shield className="w-5 h-5" />,
    span: "md:col-span-2",
  },
  {
    title: "Real-Time Wait Times",
    desc: "See estimated wait times at nearby emergency rooms and urgent care centers.",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    title: "Telehealth Options",
    desc: "Connect with a provider from home when in-person care isn't necessary.",
    icon: <Smartphone className="w-5 h-5" />,
  },
  {
    title: "Nearby Facilities",
    desc: "Find ERs, urgent care, walk-in clinics, pharmacies, and specialty services on an interactive map.",
    icon: <MapPin className="w-5 h-5" />,
    span: "md:col-span-2",
  },
];

export default function Home() {
  const router = useRouter();
  const isMobile = useMobileCheck();
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    router.prefetch("/map");
  }, [router]);

  const handleMapNavigation = () => {
    if (isMobile) {
      setShowMobileWarning(true);
    } else {
      router.push("/map?welcome=true");
    }
  };

  return (
    <div className="bg-black text-white relative min-h-screen">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold">ERly</span>
          </div>
          <AuthButton />
        </div>
      </nav>

      {/* Subtle gradient background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)",
        }}
      />

      {/* Hero Section */}
      <div className="relative h-screen overflow-hidden z-10 pt-16">
        <div className="relative h-full flex flex-col items-center justify-center">
          <motion.div
            className="text-center max-w-4xl px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
              <Activity className="w-4 h-4" />
              Healthcare Navigation
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-[1.1] tracking-tight">
              <span className="text-white">Find the right care,</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                right now.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Describe your symptoms and get matched with the best care
              option — from emergency rooms to telehealth.
            </p>
            <button
              onClick={handleMapNavigation}
              className="group relative h-14 px-8 mx-auto rounded-full overflow-hidden bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all duration-500 hover:scale-105 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 flex items-center justify-center gap-3 text-white font-semibold text-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
              Everything you need
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Smart tools to help you navigate healthcare decisions with
              confidence.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                className={`rounded-2xl overflow-hidden relative group glass p-6 hover:scale-[1.02] transition-transform duration-300 ${feature.span || ""}`}
                variants={fadeInUp}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-white/50 text-base leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
              How it works
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Three steps to the right care.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                className="relative rounded-2xl overflow-hidden glass group p-6 hover:scale-[1.02] transition-transform duration-300"
                {...fadeInUp}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-bold text-white/10">
                    {step.num}
                  </span>
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {step.title}
                </h3>
                <p className="text-white/50 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          {...fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-6">
            Don&apos;t wait when it matters.
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Get instant triage recommendations and find nearby care in seconds.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold px-8 py-6 rounded-full shadow-lg shadow-emerald-500/20"
            onClick={handleMapNavigation}
          >
            Start Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">© 2026 ERly.</p>
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Healthcare Navigation</span>
          </div>
        </div>
      </footer>

      <MobileWarningModal
        isOpen={showMobileWarning}
        onClose={() => setShowMobileWarning(false)}
      />
    </div>
  );
}
