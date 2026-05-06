import React, { useState, useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Map as MapIcon, Layers, Info, Settings, ChevronRight, ChevronLeft, Loader2, AlertCircle, ShieldCheck, Navigation } from 'lucide-react';
import { AqAirQo } from '@airqo/icons-react';
import { AirQualityModule } from './components/AirQualityModule';
import { ActivityPlanner } from './components/ActivityPlanner';
import { WeatherWidget } from './components/WeatherWidget';
import { cn } from './lib/utils';
import { getAQIStatus } from './lib/aqi';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== '';

export default function App() {
  const [viewMode, setViewMode] = useState<'heatmap' | 'markers' | 'neighborhoods'>('markers');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<{ count: number; average: number; max: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(false);

  // Animation & Forecast State
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeKeys, setTimeKeys] = useState<string[]>([]);
  const [isForecastMode, setIsForecastMode] = useState(false);

  // Forecast mock logic (pattern based)
  const forecastData = useMemo(() => {
    if (!stats) return [];
    const baseAvg = stats.average;
    const forecast = [];
    const now = new Date();
    
    for (let i = 1; i <= 24; i++) {
      const futureTime = new Date(now.getTime() + i * 3600000);
      const hour = futureTime.getHours();
      
      // Simulate daily traffic pattern
      let multiplier = 1.0;
      if (hour >= 7 && hour <= 9) multiplier = 1.25; // AM Peak
      if (hour >= 17 && hour <= 20) multiplier = 1.35; // PM Peak
      if (hour >= 0 && hour <= 5) multiplier = 0.75; // Night drop
      
      forecast.push({
        time: futureTime.toLocaleTimeString([], { hour: 'numeric' }),
        fullTime: futureTime.toISOString(),
        pm25: baseAvg * multiplier,
        status: getAQIStatus(baseAvg * multiplier)
      });
    }
    return forecast;
  }, [stats]);

  const currentStatus = useMemo(() => {
    if (isForecastMode) {
      // In forecast mode, the timeIndex refers to the forecast array
      const item = forecastData[timeIndex % forecastData.length];
      return item ? item.status : null;
    }
    return stats ? getAQIStatus(stats.average) : null;
  }, [isForecastMode, timeIndex, forecastData, stats]);

  const displayStats = useMemo(() => {
    if (isForecastMode) {
      const item = forecastData[timeIndex % forecastData.length];
      return item ? { average: item.pm25 } : stats;
    }
    return stats;
  }, [isForecastMode, timeIndex, forecastData, stats]);

  // Handle auto-play
  useEffect(() => {
    if (!isPlaying || timeKeys.length === 0 || isForecastMode) return;
    
    const interval = setInterval(() => {
      setTimeIndex((prev) => (prev + 1) % timeKeys.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isPlaying, timeKeys.length, isForecastMode]);

  const formattedTime = useMemo(() => {
    if (isForecastMode) {
      const item = forecastData[timeIndex % forecastData.length];
      return item ? `Tomorrow ${item.time}` : 'Forecast';
    }
    if (timeKeys.length === 0) return 'Live Data';
    const key = timeKeys[timeIndex % timeKeys.length];
    return new Date(key + ':00:00Z').toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      weekday: 'short'
    });
  }, [timeKeys, timeIndex, isForecastMode, forecastData]);

  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 font-sans p-4">
        <div className="text-center max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Google Maps API Key Required</h2>
          <p className="text-slate-600 mb-6 font-medium">To visualize air quality data, you need to configure your Google Maps API key.</p>
          
          <div className="space-y-4 text-left">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-2">Step 1: Get an API Key</h3>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start" 
                target="_blank" 
                rel="noopener"
                className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                Go to Google Cloud Console
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-2">Step 2: Add to AI Studio</h3>
              <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                <li>Click the <strong>Settings</strong> gear icon (top-right corner)</li>
                <li>Go to <strong>Secrets</strong></li>
                <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the name</li>
                <li>Paste your API key as the value</li>
              </ul>
            </div>
          </div>
          
          <p className="mt-8 text-sm text-slate-400 italic font-mono">The app will automatically rebuild after you add the secret.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="beta">
      <div className="relative w-full h-screen overflow-hidden bg-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900">
        {/* Navigation / Header */}
        <header className="absolute top-4 left-4 z-20 flex items-center gap-4">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-2"
          >
            <AqAirQo size={20} color="#0284C7" />
            <h1 className="font-bold text-slate-800 tracking-tight">EcoVista</h1>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Check your air. Stay safe.</span>
          </motion.div>
        </header>

        {/* Sidebar Controls */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="absolute top-20 left-4 bottom-10 w-80 z-20 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-200/60 p-8 flex flex-col pointer-events-auto"
            >
              <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide">
                {/* Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
                  <button 
                    onClick={() => setIsSimpleMode(true)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                      isSimpleMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Simple
                  </button>
                  <button 
                    onClick={() => setIsSimpleMode(false)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                      !isSimpleMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Detailed
                  </button>
                </div>

                {/* 1. Big Air Status Card (Live or Forecast) */}
                {currentStatus && (
                  <section className={cn(
                    "animate-in fade-in slide-in-from-bottom-3 duration-700 rounded-[2.2rem] p-7 text-white overflow-hidden relative shadow-lg transition-colors duration-500",
                    isForecastMode ? "bg-indigo-900" : "bg-slate-900"
                  )}>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
                          {isForecastMode ? 'Forecast Outlook' : 'City Outlook'}
                        </p>
                        <ShieldCheck className={cn(
                          "w-4 h-4 opacity-50",
                          isForecastMode ? "text-indigo-400" : "text-blue-400"
                        )} />
                      </div>
                      
                      <div className="flex items-center gap-4 mb-5">
                        <span className="text-5xl drop-shadow-md">
                          {currentStatus.emoji}
                        </span>
                        <div>
                          <h2 className="text-2xl font-black leading-[1.1] tracking-tight">
                            {currentStatus.label}
                          </h2>
                          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                            {isForecastMode ? 'Predicted' : 'Current'}: {displayStats?.average.toFixed(0)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-white/10 rounded-2xl p-5 border border-white/5 backdrop-blur-md">
                        <p className="text-[14px] font-semibold leading-relaxed text-slate-100">
                          {isForecastMode ? `Air quality is expected to be ${currentStatus?.label} at this time. Plan outdoor activities around the cleanest windows.` : currentStatus?.advice}
                        </p>
                      </div>

                    {!isSimpleMode && isForecastMode && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                         <div className="flex -space-x-1">
                           {forecastData.slice(0, 4).map((f, i) => (
                             <div key={i} className={cn("w-6 h-6 rounded-full border border-slate-900 flex items-center justify-center text-[10px]", f.status.color)} style={{ backgroundColor: f.status.color }}>
                               {f.status.emoji}
                             </div>
                           ))}
                         </div>
                         <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">24H Trend Ready</p>
                      </div>
                    )}
                    </div>
                    {/* Decorative glow */}
                    <div className={cn(
                      "absolute -bottom-16 -right-16 w-48 h-48 blur-[80px] rounded-full opacity-30",
                      currentStatus.level === 'good' ? "bg-[#22c55e]" :
                      currentStatus.level === 'bad' ? "bg-[#f97316]" : "bg-[#ef4444]"
                    )} />
                  </section>
                )}

                {/* 1.5 Weather Widget */}
                {!isSimpleMode && <WeatherWidget />}

                {/* 2. Activity Planner */}
                {forecastData.length > 0 && !isSimpleMode && <ActivityPlanner forecast={forecastData} />}

                <section>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 block">Pick Your Map</label>
                  <div className="grid grid-cols-1 gap-2 bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200/50">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setViewMode('heatmap')}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300",
                          viewMode === 'heatmap' ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        )}
                      >
                        <Layers className="w-5 h-5 mb-0.5" />
                        Danger zones
                      </button>
                      <button
                        onClick={() => setViewMode('markers')}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300",
                          viewMode === 'markers' ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        )}
                      >
                        <MapIcon className="w-5 h-5 mb-0.5" />
                        Live Sensors
                      </button>
                    </div>
                    <button
                      onClick={() => setViewMode('neighborhoods')}
                      className={cn(
                        "flex items-center justify-center gap-3 px-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300",
                        viewMode === 'neighborhoods' ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                      )}
                    >
                      <Navigation className="w-5 h-5" />
                      Neighborhoods
                    </button>
                  </div>
                </section>

                {!isSimpleMode && (
                  <>
                    <section className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] block">How to Stay Safe</label>
                      <div className="space-y-5">
                        {[
                          { label: 'Safe Air', advice: 'Good for everyone 😊', color: 'bg-[#22c55e]' },
                          { label: 'Unhealthy', advice: 'Sensitive groups stay alert 🟠', color: 'bg-[#f97316]' },
                          { label: 'Dangerous', advice: 'Stay inside! 😷', color: 'bg-[#ef4444]' },
                        ].map((item) => (
                          <div key={item.label} className="flex gap-4 group cursor-default">
                            <div className={cn("w-2 h-10 rounded-full mt-1 shrink-0 transition-transform group-hover:scale-y-110", item.color)} />
                            <div>
                              <p className="text-[13px] font-black text-slate-800 leading-none mb-1.5 uppercase tracking-wide">{item.label}</p>
                              <p className="text-xs text-slate-500 font-bold">{item.advice}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="bg-blue-600 rounded-[2.2rem] p-6 text-white shadow-xl shadow-blue-200/50 relative overflow-hidden">
                      <div className="relative z-10">
                        <h4 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-widest">
                           <ShieldCheck className="w-4 h-4" />
                           Pro Tips
                        </h4>
                        <ul className="text-[11px] space-y-3 font-bold uppercase tracking-wider opacity-90">
                          <li className="flex gap-3 leading-snug"><span>★</span> Morning traffic makes air worse.</li>
                          <li className="flex gap-3 leading-snug"><span>★</span> Avoid busy roads for jogging.</li>
                          <li className="flex gap-3 leading-snug"><span>★</span> Mask up in "Danger" areas.</li>
                        </ul>
                      </div>
                      <Wind className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
                    </section>
                  </>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AqAirQo size={32} color="#0284C7" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Powered By</p>
                    <p className="text-sm font-black text-slate-800">AirQo Africa</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-2xl border border-green-200/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "absolute bottom-10 z-30 w-10 h-10 bg-white rounded-full shadow-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all active:scale-95",
            isSidebarOpen ? "left-[312px]" : "left-4"
          )}
        >
          {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* Main Map View */}
        <main className="w-full h-full cursor-grab active:cursor-grabbing">
          <Map
            defaultCenter={{ lat: 1.3733, lng: 32.2903 }} // Central Uganda
            defaultZoom={7.5}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            colorScheme="LIGHT"
            disableDefaultUI={true}
            gestureHandling="greedy"
          >
            <AirQualityModule 
              viewMode={viewMode} 
              timeIndex={timeIndex}
              isForecastMode={isForecastMode}
              forecastData={forecastData}
              onTimeDataChange={setTimeKeys}
              onStatsUpdate={setStats} 
              onLoadingChange={setIsLoading}
            />
          </Map>
        </main>

        {/* 🎞️ Time Animation & Scrubber Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-none">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-slate-200/50 p-4 pointer-events-auto flex items-center gap-4"
          >
            <button
               onClick={() => setIsPlaying(!isPlaying)}
               className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95",
                 isPlaying ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
               )}
            >
               {isPlaying ? 
                 <div className="flex gap-1"><div className="w-1.5 h-4 bg-white rounded-full"/><div className="w-1.5 h-4 bg-white rounded-full"/></div> : 
                 <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-slate-600 border-b-[8px] border-b-transparent ml-1" />
               }
            </button>

            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
                  {formattedTime}
                </span>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsForecastMode(false)}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      !isForecastMode ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Historical
                  </button>
                  <button 
                    onClick={() => setIsForecastMode(true)}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      isForecastMode ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Forecast
                  </button>
                </div>
              </div>
              
              <div className="relative h-4 group px-1 flex items-center">
                <div className="absolute inset-x-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={false}
                    animate={{ width: `${(timeIndex / ((isForecastMode ? forecastData.length : timeKeys.length) - 1 || 1)) * 100}%` }}
                    className={cn("h-full", isForecastMode ? "bg-indigo-500" : "bg-blue-500")}
                  />
                </div>
                <input 
                  type="range"
                  min="0"
                  max={(isForecastMode ? forecastData.length : timeKeys.length) - 1}
                  value={timeIndex}
                  onChange={(e) => {
                    setTimeIndex(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end pr-2 border-l border-slate-100 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Air Intensity</p>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={cn("w-3 h-1 rounded-full", i <= 2 ? "bg-blue-200" : "bg-slate-100")} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Global Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3"
              >
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm font-bold text-slate-700 tracking-tight">Syncing Live Data...</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend / Status Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200/50 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                   <div className="w-full h-full bg-blue-100 animate-pulse" />
                 </div>
               ))}
             </div>
             <p className="text-xs font-bold text-slate-800 leading-none">+250 Active Devices</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md p-3 rounded-[1.5rem] shadow-lg border border-slate-200/50 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Safe</span>
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-full bg-[#f97316]" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Careful</span>
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Danger</span>
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
