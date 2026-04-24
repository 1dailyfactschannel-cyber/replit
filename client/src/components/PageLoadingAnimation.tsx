import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function PageLoadingAnimation() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-8">
        {/* Rotating m4 Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-4xl shadow-xl"
          >
            m4
          </motion.div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center space-y-3"
        >
          <h2 className="text-2xl font-bold tracking-wide text-primary">
            portal
          </h2>
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-sm text-muted-foreground font-medium"
          >
            Загрузка...
          </motion.p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 220 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="h-1.5 bg-muted rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ x: [-220, 220] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export function SectionLoadingSpinner({ text = "Загрузка..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-8 h-8 text-primary" />
      </motion.div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-sm text-muted-foreground"
      >
        {text}
      </motion.p>
    </div>
  );
}

export function CardLoadingPulse() {
  return (
    <div className="p-4 space-y-3">
      <motion.div
        className="h-4 bg-muted rounded w-3/4"
        animate={{
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="h-4 bg-muted rounded w-1/2"
        animate={{
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />
    </div>
  );
}
