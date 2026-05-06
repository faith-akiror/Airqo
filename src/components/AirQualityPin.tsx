import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AQIStatus } from '../lib/aqi';

interface AirQualityPinProps {
  status: AQIStatus;
  pm25: number;
}

export function AirQualityPin({ status }: AirQualityPinProps) {
  const isDanger = status.level === 'danger';

  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      {/* Background Pulse for Danger */}
      {isDanger && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-red-400 rounded-full blur-md"
        />
      )}

      {/* Main Pin Container */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-xl relative z-10 transition-colors",
          status.level === 'good' ? "bg-green-500" : 
          status.level === 'bad' ? "bg-orange-500" : "bg-red-600"
        )}
      >
        <span>{status.emoji}</span>
      </motion.div>

      {/* Triangle pointer */}
      <div 
        className={cn(
          "w-3 h-3 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent -mt-1 shadow-sm relative z-0",
          status.level === 'good' ? "border-t-green-500" : 
          status.level === 'bad' ? "border-t-orange-500" : "border-t-red-600"
        )} 
      />

      {/* Tooltip on Hover */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-2xl">
        {status.label}
      </div>
    </div>
  );
}
