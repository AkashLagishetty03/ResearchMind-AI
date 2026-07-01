import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface ConfidenceChartProps {
  score: number;
}

export const ConfidenceChart: React.FC<ConfidenceChartProps> = ({ score }) => {
  // Determine bounds
  let level = "Medium";
  let colorClass = "text-brand-warning";
  let strokeColor = "#F59E0B"; // brand-warning
  let bgGradient = "from-amber-500/5 to-amber-500/0 border-amber-200/50";
  let Icon = Shield;

  if (score <= 40) {
    level = "Low Confidence";
    colorClass = "text-rose-600";
    strokeColor = "#EF4444"; 
    bgGradient = "from-rose-500/5 to-rose-500/0 border-rose-200/50";
    Icon = ShieldAlert;
  } else if (score >= 71) {
    level = "High Confidence";
    colorClass = "text-brand-success";
    strokeColor = "#10B981"; 
    bgGradient = "from-emerald-500/5 to-emerald-500/0 border-emerald-200/50";
    Icon = ShieldCheck;
  } else {
    level = "Medium Confidence";
    colorClass = "text-brand-warning";
    strokeColor = "#F59E0B";
    bgGradient = "from-amber-500/5 to-amber-500/0 border-amber-200/50";
    Icon = Shield;
  }

  // Radial calculation
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`p-6 rounded-2xl border bg-gradient-to-br ${bgGradient} backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 w-full shadow-premium hover:shadow-premium-lg transition-all bg-white`}>
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <span className={`text-xs font-bold tracking-wider uppercase ${colorClass}`}>
            {level}
          </span>
        </div>
        <h3 className="text-lg font-black text-brand-text-primary mb-2">Research Certainty Score</h3>
        <p className="text-xs text-brand-text-secondary leading-relaxed font-semibold">
          Determined by evidence strength, multi-agent agreement consensus, volume of supporting findings, and absence of semantic ambiguity.
        </p>

        {/* Linear progress bar for quick scan */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-brand-text-secondary font-bold mb-1.5">
            <span>Certainty Level</span>
            <span>{score}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: strokeColor }}
            />
          </div>
        </div>
      </div>

      {/* Circle gauge representation */}
      <div className="relative flex items-center justify-center w-32 h-32 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9" 
            strokeWidth="9"
          />
          {/* Progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="9"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        {/* Inner text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl font-black text-brand-text-primary"
          >
            {score}%
          </motion.span>
          <span className="text-[9px] text-brand-text-secondary uppercase tracking-wider font-bold mt-0.5">
            Certainty
          </span>
        </div>
      </div>
    </div>
  );
};
