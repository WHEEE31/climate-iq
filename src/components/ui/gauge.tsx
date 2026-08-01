import * as React from "react"
import { cn } from "@/lib/utils"

const Gauge = ({ 
  value, 
  max = 100, 
  size = 200, 
  strokeWidth = 16, 
  className 
}: { 
  value: number; 
  max?: number; 
  size?: number; 
  strokeWidth?: number; 
  className?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc ranges from 135deg to 405deg (270 degrees total)
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  // Calculate the dasharray and dashoffset
  const circumference = 2 * Math.PI * radius;
  const arcLength = (circumference * totalAngle) / 360;
  
  // Progress
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const progressRatio = normalizedValue / max;
  const progressLength = arcLength * progressRatio;

  // Stroke dasharray pattern: [length of arc, length of rest of circle]
  const dashArray = `${arcLength} ${circumference}`;
  const progressDashArray = `${progressLength} ${circumference}`;

  // Start rotation to put 0 at 135 degrees
  const rotation = startAngle;

  const getColor = (val: number) => {
    if (val < 20) return "var(--color-risk-minimal)";
    if (val < 40) return "var(--color-risk-low)";
    if (val < 60) return "var(--color-risk-moderate)";
    if (val < 80) return "var(--color-risk-high)";
    if (val < 95) return "var(--color-risk-very-high)";
    return "var(--color-risk-extreme)";
  };

  const color = getColor(normalizedValue);

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Background Arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
        />
        
        {/* Progress Arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={progressDashArray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Content in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-5xl font-bold tabular-nums" style={{ color }}>
          {Math.round(normalizedValue)}
        </span>
        <span className="text-sm text-muted-foreground mt-1 uppercase tracking-wider font-medium">
          Out of {max}
        </span>
      </div>
    </div>
  );
};

export { Gauge };
