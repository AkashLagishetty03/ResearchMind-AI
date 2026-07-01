import { motion } from "framer-motion";
import { 
  Users, 
  ShieldAlert, 
  TrendingUp, 
  FileText, 
  Gauge, 
  ArrowRight, 
  Sparkles 
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  onDemoStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onDemoStart }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  };

  const features = [
    {
      Icon: Users,
      title: "Multi-Agent Research",
      description: "Parallel specialized agents assemble objective evidence, facts, and baseline support for queries.",
      color: "text-brand-primary",
      bg: "bg-indigo-50/50 border-indigo-100/50"
    },
    {
      Icon: ShieldAlert,
      title: "Critical Analysis",
      description: "Dedicated Critic Agent actively challenges assumptions, flags bias, and gauges uncertainties.",
      color: "text-rose-500",
      bg: "bg-rose-50/50 border-rose-100/50"
    },
    {
      Icon: TrendingUp,
      title: "Trend Forecasting",
      description: "Identifies forward market trajectories, expected timeframes, and upcoming industry directions.",
      color: "text-cyan-600",
      bg: "bg-cyan-50/50 border-cyan-100/50"
    },
    {
      Icon: FileText,
      title: "Executive Reports",
      description: "Compiles deep technical reports structured with findings, opportunity matrixes, and key risks.",
      color: "text-brand-accent",
      bg: "bg-purple-55/50 border-purple-100/50"
    },
    {
      Icon: Gauge,
      title: "Confidence Scoring",
      description: "Applies multi-factor mathematical weights (agreement, evidence count) to render final certainty levels.",
      color: "text-brand-warning",
      bg: "bg-amber-50/50 border-amber-100/50"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-brand-bg relative font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-5%] left-[20%] w-[600px] h-[600px] bg-indigo-200/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-16 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-primary/15 bg-brand-primary/5 text-brand-primary text-xs font-bold mb-6 tracking-wide"
        >
          <Sparkles className="w-3.5 h-3.5" />
          The Future of Intelligence Systems
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-5xl md:text-6xl font-black text-brand-text-primary tracking-tight leading-[1.1] mb-6"
        >
          Research Like a Team of <br className="hidden md:block"/>
          <span className="text-brand-primary bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent">AI Analysts</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg md:text-xl text-brand-text-secondary max-w-3xl mx-auto leading-relaxed mb-10"
        >
          ResearchMind AI orchestrates multiple specialized AI models that collaborate, debate, verify evidence, and generate professional research reports.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onStart}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-base transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer active:scale-95"
          >
            Start Research
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDemoStart}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-brand-text-primary font-bold text-base transition-all hover:scale-[1.01] hover:shadow-premium cursor-pointer active:scale-95"
          >
            View Demo
          </button>
        </motion.div>
      </div>

      {/* Decorative Interactive Mock Screen */}
      <div className="max-w-4xl mx-auto px-6 mb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="rounded-2xl border border-gray-200/50 bg-white p-4.5 shadow-premium-xl relative group"
        >
          {/* Mac Buttons */}
          <div className="flex gap-1.5 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-400/90 block" />
            <span className="w-3 h-3 rounded-full bg-amber-400/90 block" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/90 block" />
          </div>
          {/* Mock Dashboard Layout */}
          <div className="grid grid-cols-3 gap-3.5 h-64 opacity-75 group-hover:opacity-95 transition-opacity duration-500">
            <div className="border border-gray-200/60 rounded-xl bg-brand-secondary/40 p-3.5 flex flex-col gap-2.5">
              <span className="w-16 h-3 bg-gray-200 rounded" />
              <span className="w-full h-8 bg-brand-primary/5 border border-brand-primary/10 rounded-lg" />
              <span className="w-full h-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="col-span-2 border border-gray-200/60 rounded-xl bg-brand-secondary/40 p-4.5 flex flex-col gap-3.5">
              <span className="w-24 h-4 bg-gray-200 rounded" />
              <span className="w-full h-3 bg-gray-100 rounded" />
              <span className="w-4/5 h-3 bg-gray-100 rounded" />
              <div className="w-full h-24 border border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-white/40">
                <span className="text-[10px] font-mono text-brand-text-secondary/60">Simulating Agent Pipelines...</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24 border-t border-gray-200/60 pt-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-brand-text-primary tracking-tight mb-4">
            Structured Decision Intelligence
          </h2>
          <p className="text-brand-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
            Standard chat agents write responses instantly, skipping validation. Our multi-agent grid critiques and validates claims step by step.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat, idx) => {
            const FeatIcon = feat.Icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                className={`p-6 rounded-2xl border ${feat.bg} flex flex-col items-start gap-4 hover:translate-y-[-4px] hover:border-gray-300 hover:shadow-premium transition-all duration-300 bg-white`}
              >
                <div className={`p-2.5 rounded-xl bg-brand-secondary border border-gray-200/50 shadow-premium ${feat.color}`}>
                  <FeatIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-text-primary mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-brand-text-secondary leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

