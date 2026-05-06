import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { AQIStatus } from '../lib/aqi';

interface ForecastItem {
  time: string;
  pm25: number;
  status: AQIStatus;
}

interface ActivityPlannerProps {
  forecast: ForecastItem[];
}

export function ActivityPlanner({ forecast }: ActivityPlannerProps) {
  // Find the best time in the next 24 hours
  const sorted = [...forecast].sort((a, b) => a.pm25 - b.pm25);
  const bestWindow = sorted[0];
  
  // Categorize activities
  const canExercise = forecast.filter(f => f.status.level === 'good').length > 0;
  const dangerSpikes = forecast.filter(f => f.status.level === 'danger').length;

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Daily Outlook</label>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Smart Advice</span>
      </div>

      <div className="bg-slate-50 rounded-[2rem] border border-slate-200/60 overflow-hidden">
        {/* Best Time Hero */}
        <div className="p-5 bg-white border-b border-slate-200/50">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Best time to go outside:</p>
            <div className="flex items-center gap-3">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                Around {bestWindow?.time}
              </h4>
              <div className="w-6 h-6 rounded-full bg-green-500 border-4 border-green-100 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500 font-bold max-w-[200px]">
              Air is cleaner during this time. Ideal for exercise and errands.
            </p>
          </div>
        </div>

        {/* Action Items */}
        <div className="p-5 space-y-5">
          <div className="flex gap-4">
             <div className={cn(
               "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
               canExercise ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
             )}>
               {canExercise ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
             </div>
             <div>
               <p className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Activities</p>
               <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                 {canExercise 
                   ? `Conditions are great for outdoor workouts near ${bestWindow?.time}.` 
                   : "Pollution levels are variable today. Stick to light activities."}
               </p>
             </div>
          </div>

          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm">
               <Info className="w-5 h-5" />
             </div>
             <div>
               <p className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Health Tip</p>
               <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                 {dangerSpikes > 0 
                   ? `Heads up: ${dangerSpikes} dangerous spikes detected in the forecast. Stay alert.` 
                   : "No critical pollution spikes predicted for the next 24 hours."}
               </p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
