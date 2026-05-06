import React from 'react';
import { Sun, CloudRain, Droplets, Thermometer, Wind } from 'lucide-react';

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: 'Sunny' | 'Rainy' | 'Cloudy';
}

export function WeatherWidget() {
  // Use current Uganda typical weather
  const weather: WeatherData = {
    temp: 26,
    humidity: 65,
    windSpeed: 12,
    condition: 'Sunny'
  };

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Local Weather</label>
        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase tracking-tighter">Live</span>
      </div>

      <div className="bg-slate-50 rounded-[2rem] border border-slate-200/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 leading-none">{weather.temp}°C</h4>
              <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">{weather.condition}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Droplets className="w-4 h-4 text-blue-500 mb-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Humidity</span>
            <span className="text-xs font-bold text-slate-800">{weather.humidity}%</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Wind className="w-4 h-4 text-slate-500 mb-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Wind</span>
            <span className="text-xs font-bold text-slate-800">{weather.windSpeed} km/h</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Thermometer className="w-4 h-4 text-red-500 mb-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Feels Like</span>
            <span className="text-xs font-bold text-slate-800">{weather.temp + 2}°C</span>
          </div>
        </div>
      </div>
    </section>
  );
}
