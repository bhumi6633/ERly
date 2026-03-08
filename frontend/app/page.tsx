"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Activity, Moon, Sun } from "lucide-react";
import { MobileWarningModal } from "@/components/modals/MobileWarningModal";
import { useMobileCheck } from "@/hooks/useMobileCheck";
import { AuthButton } from "@/components/auth-button";

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: [0, 0, 0.2, 1] as const },
};

const CORE_FEATURES = [
  {
    title: "AI Symptom Triage",
    desc: "Instant severity assessment",
    icon: "🧠",
    shape: "droplet",
    color: "bg-blue-200",
  },
  {
    title: "Smart Hospital Routing",
    desc: "Find the best ER or clinic",
    icon: "🏥",
    shape: "cross",
    color: "bg-yellow-200",
  },
  {
    title: "Real-Time Wait Times",
    desc: "Know before you go",
    icon: "⏱️",
    shape: "blob",
    color: "bg-green-200",
  },
  {
    title: "Digital Pre-Check-In",
    desc: "Skip paperwork at arrival",
    icon: "📋",
    shape: "hexagon",
    color: "bg-purple-200",
  },
  {
    title: "Clinical Summary Generation",
    desc: "Doctors get your case instantly",
    icon: "📊",
    shape: "star",
    color: "bg-indigo-200",
  },
  {
    title: "Vitals Monitoring",
    desc: "Continuous patient safety",
    icon: "❤️",
    shape: "circle",
    color: "bg-yellow-100",
  },
];

export default function Home() {
  const router = useRouter();
  const isMobile = useMobileCheck();
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Load theme preference from localStorage, default to dark mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Set default to dark mode
      setIsDarkMode(true);
      localStorage.setItem('theme', 'dark');
    }
    router.prefetch("/map");
  }, [router]);

  const handleMapNavigation = () => {
    if (isMobile) {
      setShowMobileWarning(true);
    } else {
      router.push("/map?welcome=true");
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    // Save theme preference to localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div className={`relative min-h-screen overflow-x-hidden transition-colors duration-500 ${
      isDarkMode ? 'bg-[#1a2332]' : 'bg-[#f5f3ed]'
    }`}>
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md border-b transition-colors duration-500 ${
        isDarkMode 
          ? 'bg-[#1a2332]/90 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={`w-7 h-7 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
            <span className={`text-2xl font-bold tracking-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>ERly</span>
          </div>
          <div className="flex items-center gap-6">
            <button className={`transition-colors text-sm font-medium ${
              isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              Features
            </button>
            <button className={`transition-colors text-sm font-medium ${
              isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              Wait Times
            </button>
            <button className={`transition-colors text-sm font-medium ${
              isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              About Us
            </button>
            <button className={`transition-colors text-sm font-medium ${
              isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              Contact
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Section 1: Hero with Doctors */}
      <section className="relative z-10 min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* Male Doctor Photo - Left */}
            <motion.div
              className="flex justify-center lg:justify-end"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative w-64 h-80 lg:w-80 lg:h-96">
                <motion.div 
                  className={`absolute inset-0 rounded-3xl shadow-2xl overflow-hidden ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                  animate={{ 
                    rotate: [3, 5, 3],
                    y: [0, -5, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&h=500&fit=crop&crop=faces" 
                    alt="Male doctor smiling"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <p className="text-sm text-gray-700 italic text-center font-medium">
                      &quot;The right care shouldn&apos;t be a guess.&quot;
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Center Content */}
            <motion.div
              className="text-center lg:col-span-1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border text-sm font-medium mb-6 ${
                isDarkMode 
                  ? 'bg-teal-500/20 border-teal-500/30 text-teal-400' 
                  : 'bg-teal-100 border-teal-200 text-teal-700'
              }`}>
                <Activity className="w-4 h-4" />
                Healthcare Navigation
              </div>

              <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <span className="block mb-2">
                  Your health isn&apos;t a dot on a map.
                </span>
                <span className={`block ${
                  isDarkMode 
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400' 
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600'
                }`}>
                  We guide you to care -
                </span>
                <span className="block">
                  no guess, no gap.
                </span>
              </h1>

              <p className={`text-lg max-w-md mx-auto mb-8 leading-relaxed ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Describe your symptoms and get matched with the best care option, from emergency rooms to telehealth.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <button
                  onClick={handleMapNavigation}
                  className="group relative px-8 py-4 rounded-full overflow-hidden bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-white font-bold text-base"
                >
                  <Activity className="w-5 h-5" />
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/map?erMap=true")}
                  className="group relative px-8 py-4 rounded-full overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-white font-bold text-base"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                  </svg>
                  ER Wait Map
                </button>
              </div>
            </motion.div>

            {/* Female Doctor Photo - Right */}
            <motion.div
              className="flex justify-center lg:justify-start"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative w-64 h-80 lg:w-80 lg:h-96">
                <motion.div 
                  className={`absolute inset-0 rounded-3xl shadow-2xl overflow-hidden ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                  animate={{ 
                    rotate: [-3, -5, -3],
                    y: [0, -5, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  <div className="relative w-full h-full">
                    <img 
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&h=500&fit=crop&crop=faces" 
                      alt="Female doctor with stethoscope"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <p className="text-sm text-gray-700 italic text-center font-medium">
                        &quot;Smarter triage starts here.&quot;
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2: Core Features */}
      <section className="relative z-10 min-h-screen flex items-center justify-center py-20 px-6">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className={`text-3xl lg:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Core Features
            </h2>
            <p className={`text-lg ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Everything you need for smarter healthcare navigation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 mb-20 max-w-6xl mx-auto px-4">
            {CORE_FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.title}
                className="relative group flex items-center justify-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.5, 
                  delay: idx * 0.1,
                }}
              >
                <div 
                  className={`${feature.color} shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-white relative overflow-hidden ${
                    feature.shape === 'droplet' ? 'rounded-[50%_50%_50%_0%] w-56 h-64 rotate-[-45deg]' :
                    feature.shape === 'cross' ? 'rounded-2xl w-full max-w-[300px] h-56' :
                    feature.shape === 'blob' ? 'rounded-[60%_40%_30%_70%/60%_30%_70%_40%] w-72 h-72' :
                    feature.shape === 'hexagon' ? 'rounded-3xl w-56 h-64' :
                    feature.shape === 'star' ? 'rounded-3xl w-64 h-72' :
                    feature.shape === 'circle' ? 'rounded-full w-64 h-64' :
                    'rounded-3xl'
                  }`}
                >
                  {/* Cross shape overlay */}
                  {feature.shape === 'cross' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="absolute w-full h-[35%] bg-yellow-300 rounded-lg"></div>
                      <div className="absolute h-full w-[35%] bg-yellow-300 rounded-lg"></div>
                    </div>
                  )}
                  
                  {/* Star shape background */}
                  {feature.shape === 'star' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0" style={{ transform: 'scale(1.15)' }}>
                        <polygon 
                          points="50,5 61,35 95,35 67,55 78,85 50,65 22,85 33,55 5,35 39,35" 
                          fill="currentColor" 
                          className="text-indigo-300"
                        />
                      </svg>
                    </div>
                  )}
                  
                  {/* Hexagon clip path */}
                  {feature.shape === 'hexagon' && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                      background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)'
                    }}></div>
                  )}
                  
                  <div className={`relative z-10 flex flex-col items-center h-full text-center px-6 ${
                    feature.shape === 'droplet' ? 'rotate-[45deg]' : ''
                  } ${
                    feature.shape === 'cross' ? 'justify-center py-6' :
                    feature.shape === 'blob' ? 'justify-center py-10' :
                    feature.shape === 'star' ? 'justify-center py-10' :
                    feature.shape === 'circle' ? 'justify-center py-8' :
                    'justify-center py-8'
                  }`}>
                    <div className={`${
                      feature.shape === 'cross' ? 'text-3xl mb-2' :
                      feature.shape === 'blob' ? 'text-4xl mb-4' :
                      feature.shape === 'star' ? 'text-3xl mb-3' :
                      feature.shape === 'circle' ? 'text-3xl mb-3' :
                      'text-3xl mb-3'
                    }`}>{feature.icon}</div>
                    <h3 className={`font-bold text-gray-900 leading-tight mb-2 ${
                      feature.shape === 'cross' ? 'text-base' :
                      feature.shape === 'blob' ? 'text-lg' :
                      feature.shape === 'star' ? 'text-base' :
                      feature.shape === 'circle' ? 'text-base' :
                      'text-base'
                    }`}>
                      {feature.title}
                    </h3>
                    <p className={`text-gray-700 leading-snug ${
                      feature.shape === 'cross' ? 'text-xs' :
                      feature.shape === 'blob' ? 'text-sm' :
                      feature.shape === 'star' ? 'text-xs' :
                      feature.shape === 'circle' ? 'text-sm' :
                      'text-xs'
                    }`}>
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How We Navigate Section */}
          <motion.div className="text-center mb-12 mt-20" {...fadeInUp}>
            <h2 className={`text-3xl lg:text-5xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              How we navigate the chaos?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Smart Triage Card */}
            <motion.div
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute -top-3 -left-3 bg-orange-500 text-white px-4 py-1 rounded-lg text-sm font-bold transform -rotate-2 z-10 shadow-lg">
                SWITCH ON IT
              </div>
              <div className={`rounded-2xl shadow-2xl p-8 transform rotate-1 hover:rotate-0 transition-all duration-300 border-4 ${
                isDarkMode 
                  ? 'bg-[#243447] border-gray-700' 
                  : 'bg-[#fef9e7] border-white'
              }`}>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Smart Triage</h3>
                <p className={`text-base leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Helps you decide if it&apos;s an ER emergency or an 
                  Urgent Care visit. We also group just humans talking to humans.
                </p>
                <div className={`mt-6 flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="font-mono">[ TELEMEDICINE ]</span>
                </div>
              </div>
            </motion.div>

            {/* The Wait Map Card */}
            <motion.div
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div className="absolute -top-3 -right-3 bg-cyan-500 text-white px-4 py-1 rounded-lg text-sm font-bold transform rotate-2 z-10 shadow-lg">
                WAIT ON IT
              </div>
              <div className={`rounded-2xl shadow-2xl p-8 transform -rotate-1 hover:rotate-0 transition-all duration-300 border-4 ${
                isDarkMode 
                  ? 'bg-[#243447] border-gray-700' 
                  : 'bg-[#fef9e7] border-white'
              }`}>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>The Wait Map</h3>
                <p className={`text-base leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Real-time ER wait times across the city. 
                  Informed by our network of care coordinators.
                </p>
                <div className={`mt-6 flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="font-mono">[ CITY NAVIGATION ]</span>
                </div>
              </div>
            </motion.div>

            {/* Vitals Tracking Card */}
            <motion.div
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="absolute -top-3 -left-3 bg-pink-500 text-white px-4 py-1 rounded-lg text-sm font-bold transform -rotate-2 z-10 shadow-lg">
                TRACK IT
              </div>
              <div className={`rounded-2xl shadow-2xl p-8 transform rotate-1 hover:rotate-0 transition-all duration-300 border-4 ${
                isDarkMode 
                  ? 'bg-[#243447] border-gray-700' 
                  : 'bg-[#fef9e7] border-white'
              }`}>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Vitals Tracking</h3>
                <p className={`text-base leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Monitor your health metrics in real-time. 
                  Share vital signs with your care team instantly.
                </p>
                <div className={`mt-6 flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="font-mono">[ WEARABLE SYNC ]</span>
                </div>
              </div>
            </motion.div>

            {/* Pre-Check-In Card */}
            <motion.div
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              <div className="absolute -top-3 -right-3 bg-purple-500 text-white px-4 py-1 rounded-lg text-sm font-bold transform rotate-2 z-10 shadow-lg">
                SKIP IT
              </div>
              <div className={`rounded-2xl shadow-2xl p-8 transform -rotate-1 hover:rotate-0 transition-all duration-300 border-4 ${
                isDarkMode 
                  ? 'bg-[#243447] border-gray-700' 
                  : 'bg-[#fef9e7] border-white'
              }`}>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Pre-Check-In</h3>
                <p className={`text-base leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Complete your paperwork digitally before arrival. 
                  Walk straight to care when you arrive.
                </p>
                <div className={`mt-6 flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="font-mono">[ DIGITAL FORMS ]</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Mission Statement - Enhanced UI */}
      <section className="relative z-10 min-h-screen flex items-center justify-center py-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Enhanced Conversation Scene - Left */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative w-full max-w-lg">
                <div className={`rounded-3xl shadow-2xl overflow-hidden ${
                  isDarkMode ? 'bg-[#243447]' : 'bg-white'
                }`}>
                  <div className="relative p-8">
                    {/* Conversation Scene */}
                    <div className="w-full h-80 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100 rounded-2xl overflow-hidden relative shadow-inner">
                      {/* Background gradient floor */}
                      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gray-200/60 to-transparent"></div>
                      
                      {/* Text on Left Side */}
                      <div className="absolute top-8 left-6 max-w-[180px]">
                        <p className="text-base text-gray-900 font-bold leading-tight mb-2">Don&apos;t wait when it matters.</p>
                        <p className="text-sm text-gray-700">Tell us how we can help.</p>
                      </div>

                      {/* Text on Right Side */}
                      <div className="absolute top-8 right-6 max-w-[140px]">
                        <p className="text-xl text-purple-900 font-black text-center">HELLO THERE!</p>
                      </div>
                      
                      {/* Character 1 (Left) - Teddy Style */}
                      <motion.div 
                        className="absolute bottom-12 left-16 z-30"
                        animate={{ 
                          y: [0, -5, 0],
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="relative">
                          {/* Head */}
                          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full shadow-lg relative">
                            {/* Eyes */}
                            <div className="absolute top-5 left-3 w-2 h-2 bg-gray-900 rounded-full"></div>
                            <div className="absolute top-5 right-3 w-2 h-2 bg-gray-900 rounded-full"></div>
                            {/* Smile */}
                            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-3 border-b-2 border-gray-900 rounded-full"></div>
                            {/* Ears */}
                            <div className="absolute -top-1 -left-2 w-5 h-5 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full"></div>
                            <div className="absolute -top-1 -right-2 w-5 h-5 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full"></div>
                          </div>
                          {/* Body */}
                          <div className="w-20 h-24 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-3xl rounded-b-full shadow-lg -mt-2 relative">
                            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Character 2 (Right) - Teddy Style */}
                      <motion.div 
                        className="absolute bottom-12 right-16 z-30"
                        animate={{ 
                          y: [0, -5, 0],
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                      >
                        <div className="relative">
                          {/* Head */}
                          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full shadow-lg relative">
                            {/* Eyes */}
                            <div className="absolute top-5 left-3 w-2 h-2 bg-gray-900 rounded-full"></div>
                            <div className="absolute top-5 right-3 w-2 h-2 bg-gray-900 rounded-full"></div>
                            {/* Smile */}
                            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-3 border-b-2 border-gray-900 rounded-full"></div>
                            {/* Ears */}
                            <div className="absolute -top-1 -left-2 w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full"></div>
                            <div className="absolute -top-1 -right-2 w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full"></div>
                          </div>
                          {/* Body */}
                          <div className="w-20 h-24 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-3xl rounded-b-full shadow-lg -mt-2 relative">
                            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Floating health icon */}
                      <motion.div 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 10, 0, -10, 0]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                        }}
                      >
                        <div className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl">
                          <Activity className="w-8 h-8 text-teal-600" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Status Cards Below */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className={`rounded-xl p-4 shadow-md border-2 ${
                        isDarkMode 
                          ? 'bg-[#1a2332] border-red-500/30' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <p className={`text-xs font-bold ${
                            isDarkMode ? 'text-red-300' : 'text-red-700'
                          }`}>
                            Vitals/Priority: <span className="text-red-500">High</span>
                          </p>
                        </div>
                        <p className={`text-[10px] ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>(Auto-Upgraded)</p>
                      </div>
                      <div className={`rounded-xl p-4 shadow-md border-2 ${
                        isDarkMode 
                          ? 'bg-[#1a2332] border-green-500/30' 
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className={`text-xs font-bold ${
                            isDarkMode ? 'text-green-300' : 'text-green-700'
                          }`}>
                            Status: <span className="text-green-600">Optimal</span>
                          </p>
                        </div>
                        <p className={`text-[10px] ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Network Routing Active</p>
                      </div>
                    </div>

                    {/* Additional info badges */}
                    <div className="flex items-center justify-between mt-4 gap-2">
                      <div className={`flex-1 rounded-lg px-3 py-2 text-center ${
                        isDarkMode ? 'bg-[#1a2332]' : 'bg-blue-50'
                      }`}>
                        <p className="text-xs font-semibold text-blue-600">SpO2: 97%</p>
                      </div>
                      <div className={`flex-1 rounded-lg px-3 py-2 text-center ${
                        isDarkMode ? 'bg-[#1a2332]' : 'bg-pink-50'
                      }`}>
                        <p className="text-xs font-semibold text-pink-600">HR: 85</p>
                      </div>
                      <div className={`flex-1 rounded-lg px-3 py-2 text-center ${
                        isDarkMode ? 'bg-[#1a2332]' : 'bg-purple-50'
                      }`}>
                        <p className="text-xs font-semibold text-purple-600">Synced</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mission Text - Right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className={`text-2xl lg:text-4xl font-bold leading-relaxed mb-8 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                In moments of crisis, clarity becomes care.
              </p>
              <p className={`text-base lg:text-lg leading-relaxed mb-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                That&apos;s why we built ERly - to guide you through uncertainty and help you reach the right care when every minute matters.
              </p>
              <p className={`text-sm lg:text-base leading-relaxed mb-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Born from the experiences of medical professionals who saw the chaos of emergency rooms firsthand, ERly uses real-time data to turn confusion into clear direction.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleMapNavigation}
                  className="group relative px-8 py-4 rounded-full overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-white font-bold text-base"
                >
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  className={`group relative px-8 py-4 rounded-full overflow-hidden transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 font-bold text-base ${
                    isDarkMode 
                      ? 'bg-[#243447] hover:bg-[#2a3d52] text-white border-2 border-gray-600' 
                      : 'bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200'
                  }`}
                >
                  Learn More
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative z-10 py-12 px-6 backdrop-blur-md border-t transition-colors duration-500 ${
        isDarkMode 
          ? 'bg-[#1a2332]/90 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Activity className={`w-8 h-8 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              <span className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>ERly</span>
            </div>
            <div className="flex items-center gap-8">
              <button className={`transition-colors text-sm font-medium ${
                isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Privacy
              </button>
              <button className={`transition-colors text-sm font-medium ${
                isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Terms
              </button>
              <button className={`transition-colors text-sm font-medium ${
                isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Contact
              </button>
              <button className={`transition-colors text-sm font-medium ${
                isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Instagram
              </button>
            </div>
          </div>
          <div className={`text-center text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <p>Made with 💙 by people, not code. © 2026 ERly Healthcare Inc. All rights reserved.</p>
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
