import { motion } from "motion/react";
import logo from "../assets/logo.png";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "กำลังโหลด..." }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #011c24 0%, #002b38 50%, #011c24 100%)"
      }}
    >
      {/* Ambient particles / background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(197,160,89,0.06) 0%, transparent 70%)" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-10 text-center px-8">

        {/* Logo  */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Glow ring */}
          <motion.div
            className="absolute inset-[-16px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(197,160,89,0.25) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Outer ring */}
          <motion.div
            className="absolute inset-[-8px] rounded-full border border-[#c5a059]/20"
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo container */}
          <div
            className="relative w-36 h-36 rounded-3xl overflow-hidden flex items-center justify-center border border-white/10"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(197,160,89,0.05))",
              boxShadow: "0 32px 80px rgba(197,160,89,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <img src={logo} alt="Apichai Logo" className="w-full h-full object-contain p-3" />
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col items-center gap-1"
        >
          <h1
            className="text-4xl font-bold tracking-[0.15em] uppercase"
            style={{ color: "#c5a059", textShadow: "0 0 40px rgba(197,160,89,0.4)" }}
          >
            Apichai
          </h1>
          <p className="text-white/40 text-xs tracking-[0.5em] uppercase font-medium">
            Beauty &amp; Aesthetic Clinic
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-16 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #c5a059, transparent)" }}
        />

        {/* Status message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <p className="text-white/50 text-sm tracking-widest">
            {message}
          </p>

          {/* Minimal progress bar */}
          <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, #c5a059, #e8d8a1, #c5a059, transparent)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
