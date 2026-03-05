import { motion } from "motion/react";

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean;
}

export const VoiceVisualizer = ({ isActive, isSpeaking }: VoiceVisualizerProps) => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Glow */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : 1,
          opacity: isActive ? [0.3, 0.6, 0.3] : 0.2,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl"
      />

      {/* Animated Sphere */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.05, 1] : isActive ? [1, 1.02, 1] : 1,
          rotate: isActive ? 360 : 0,
        }}
        transition={{
          scale: {
            duration: isSpeaking ? 0.5 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
          rotate: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          },
        }}
        className="relative z-10 w-48 h-48 rounded-full overflow-hidden border border-blue-400/30 bg-gradient-to-br from-blue-900/40 to-black shadow-[0_0_50px_rgba(59,130,246,0.5)]"
      >
        {/* Inner Mesh/Waves Effect */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent" />
          <motion.div
            animate={{
              y: ["-20%", "20%", "-20%"],
              x: ["-10%", "10%", "-10%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"
          />
        </div>

        {/* Center Mic Icon or Dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: isSpeaking ? [1, 1.5, 1] : 1,
            }}
            className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"
          />
        </div>
      </motion.div>

      {/* Orbiting particles for extra "magic" */}
      {isActive && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 10 + i * 5,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 pointer-events-none"
            >
              <div 
                className="absolute top-0 left-1/2 w-1 h-1 bg-blue-300 rounded-full blur-[1px]"
                style={{ transform: `translateX(-50%) translateY(${i * 20}px)` }}
              />
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
};
