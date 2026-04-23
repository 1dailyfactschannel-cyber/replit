import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// M4 Bank Hexagon Segments Component
function HexagonSegments({ 
  size = 120, 
  segmentLength = 35,
  strokeWidth = 16,
  color = "#1e3a8a" // M4 dark blue
}: { 
  size?: number; 
  segmentLength?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 5;
  
  // Calculate hexagon vertex positions
  const getVertex = (index: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  // Get segment positions (middle of each side)
  const getSegmentPosition = (index: number) => {
    const v1 = getVertex(index);
    const v2 = getVertex((index + 1) % 6);
    return {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2,
      angle: index * 60
    };
  };

  const segments = [0, 1, 2, 3, 4, 5].map(i => getSegmentPosition(i));
  
  // Direction vectors for animation (segments come from outside)
  const directions = [
    { x: 0, y: -1 },    // top
    { x: 0.87, y: -0.5 }, // top-right
    { x: 0.87, y: 0.5 },  // bottom-right
    { x: 0, y: 1 },     // bottom
    { x: -0.87, y: 0.5 }, // bottom-left
    { x: -0.87, y: -0.5 } // top-left
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {segments.map((seg, i) => {
        const dir = directions[i];
        const startX = seg.x + dir.x * 30;
        const startY = seg.y + dir.y * 30;
        
        return (
          <motion.g key={i}>
            {/* Background track */}
            <rect
              x={seg.x - segmentLength / 2}
              y={seg.y - strokeWidth / 2}
              width={segmentLength}
              height={strokeWidth}
              rx={strokeWidth / 2}
              fill="#e2e8f0"
              transform={`rotate(${seg.angle}, ${seg.x}, ${seg.y})`}
            />
            {/* Animated segment */}
            <motion.rect
              x={startX - segmentLength / 2}
              y={startY - strokeWidth / 2}
              width={segmentLength}
              height={strokeWidth}
              rx={strokeWidth / 2}
              fill={color}
              filter="url(#glow)"
              transform={`rotate(${seg.angle}, ${startX}, ${startY})`}
              initial={{ 
                x: 0, 
                y: 0,
                opacity: 0,
                scale: 0.8
              }}
              animate={{ 
                x: -dir.x * 30, 
                y: -dir.y * 30,
                opacity: 1,
                scale: 1
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            />
          </motion.g>
        );
      })}
    </svg>
  );
}

export function PageLoadingAnimation() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-8">
        {/* M4 Hexagon Logo Animation */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative"
        >
          {/* Hexagon with building segments */}
          <div className="relative">
            <HexagonSegments size={140} segmentLength={40} strokeWidth={18} />
            
            {/* M4 Text in center */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 0.8, 
                duration: 0.5, 
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <span 
                className="text-4xl font-black tracking-tighter"
                style={{ 
                  color: "#1e3a8a",
                  fontFamily: "system-ui, -apple-system, sans-serif"
                }}
              >
                M4
              </span>
            </motion.div>
            
            {/* Pulsing ring after assembly */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#1e3a8a]/30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1.3],
                opacity: [0.6, 0, 0]
              }}
              transition={{
                delay: 1.2,
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center space-y-3"
        >
          <h2 
            className="text-2xl font-bold tracking-wide"
            style={{ color: "#1e3a8a" }}
          >
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

        {/* Progress bar with M4 brand colors */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 220 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="h-1.5 bg-slate-200 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full rounded-full"
            style={{ 
              background: "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #1e3a8a 100%)"
            }}
            animate={{
              x: [-220, 220],
            }}
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
