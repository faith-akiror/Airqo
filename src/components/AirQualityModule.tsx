import { useEffect, useState, useRef, useMemo } from 'react';
import { AdvancedMarker, useMap, InfoWindow, Pin, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Marker } from '@googlemaps/markerclusterer';
import axios from 'axios';
import { cn } from '../lib/utils';
import { HeatmapOverlay, AirQualityData } from './HeatmapOverlay';
import { NeighborhoodOverlay } from './NeighborhoodOverlay';
import { AirQualityPin } from './AirQualityPin';

import { getAQIStatus } from '../lib/aqi';

interface AirQualityModuleProps {
  viewMode: 'heatmap' | 'markers' | 'neighborhoods';
  timeIndex: number;
  isForecastMode: boolean;
  forecastData: any[];
  onTimeDataChange?: (timeKeys: string[]) => void;
  onStatsUpdate?: (stats: { count: number; average: number; max: number }) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function AirQualityModule({ 
  viewMode, 
  timeIndex, 
  isForecastMode,
  forecastData,
  onTimeDataChange, 
  onStatsUpdate, 
  onLoadingChange 
}: AirQualityModuleProps) {
  const [data, setData] = useState<AirQualityData[]>([]);
  const [grids, setGrids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<AirQualityData | null>(null);
  
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<{[key: string]: Marker}>({});

  // 1. Group data by hour
  const timeGrouped = useMemo(() => {
    const groups: Record<string, AirQualityData[]> = {};
    data.forEach(p => {
      const key = new Date(p.time).toISOString().slice(0, 13);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [data]);

  const timeKeys = useMemo(() => Object.keys(timeGrouped).sort(), [timeGrouped]);

  useEffect(() => {
    if (timeKeys.length > 0) {
      onTimeDataChange?.(timeKeys);
    }
  }, [timeKeys, onTimeDataChange]);

  const currentSnapshot = useMemo(() => {
    if (timeKeys.length === 0) return [];
    
    if (isForecastMode) {
      // Use the latest historical snapshot as a baseline for the forecast
      const baselineKey = timeKeys[timeKeys.length - 1];
      const baseline = timeGrouped[baselineKey] || [];
      const forecastItem = forecastData[timeIndex % forecastData.length];
      
      if (!forecastItem || !baseline.length) return baseline;

      // Calculate multiplier based on baseline average vs forecast average
      const baselineAvg = baseline.reduce((acc, p) => acc + p.pm2_5.value, 0) / baseline.length;
      const multiplier = forecastItem.pm25 / (baselineAvg || 1);

      return baseline.map(p => ({
        ...p,
        pm2_5: { value: p.pm2_5.value * multiplier },
        time: forecastItem.fullTime
      }));
    }

    const index = timeIndex % timeKeys.length;
    const key = timeKeys[index];
    return timeGrouped[key] || [];
  }, [timeGrouped, timeKeys, timeIndex, isForecastMode, forecastData]);

  // Update stats when snapshot changes
  useEffect(() => {
    if (currentSnapshot.length > 0 && onStatsUpdate) {
      const values = currentSnapshot.map(m => m.pm2_5.value);
      onStatsUpdate({
        count: currentSnapshot.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values)
      });
    }
  }, [currentSnapshot, onStatsUpdate]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        onLoadingChange?.(true);
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const params: any = { tenant: 'airqo' };
        
        // AirQo API often prefers ISO but without milliseconds or specifically formatted
        // Use a simpler approach - if recent data is enough, we don't need startTime/endTime
        // which are often the cause of 400 errors if not exactly right for the tenant/site
        
        // Let's try explicitly passing startTime/endTime in a very clean format
        params.startTime = yesterday.toISOString().split('.')[0] + 'Z';
        params.endTime = now.toISOString().split('.')[0] + 'Z';

        // Fetch both measurements and grids
        const [measurementsRes, gridsRes] = await Promise.all([
          axios.get('/api/airquality', { params }),
          axios.get('/api/grids', {
            params: { tenant: 'airqo' }
          })
        ]);

        const measurements = measurementsRes.data.measurements || measurementsRes.data;
        const gridsData = gridsRes.data.grids || gridsRes.data.sites || gridsRes.data;

        setData(measurements?.length > 0 ? measurements : generateMockData());
        setGrids(gridsData?.length > 0 ? gridsData : generateMockGrids());
      } catch (error) {
        console.error('Error fetching air quality data:', error);
        setData(generateMockData());
        setGrids(generateMockGrids());
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    const generateMockGrids = () => [
      {
        _id: 'g1',
        name: 'Kampala Central',
        aqi: 32,
        shape: {
          type: 'Polygon',
          coordinates: [[[32.57, 0.35], [32.59, 0.35], [32.59, 0.33], [32.57, 0.33], [32.57, 0.35]]]
        }
      },
      {
        _id: 'g2',
        name: 'Makindye',
        aqi: 45,
        shape: {
          type: 'Polygon',
          coordinates: [[[32.57, 0.33], [32.59, 0.33], [32.59, 0.31], [32.57, 0.31], [32.57, 0.33]]]
        }
      },
      {
        _id: 'g3',
        name: 'Nakawa',
        aqi: 28,
        shape: {
          type: 'Polygon',
          coordinates: [[[32.59, 0.35], [32.61, 0.35], [32.61, 0.33], [32.59, 0.33], [32.59, 0.35]]]
        }
      }
    ];

    const generateMockData = (): AirQualityData[] => {
      const mock: AirQualityData[] = [];
      const now = new Date();
      const stations = [
        { lat: 0.3476, lng: 32.5825, id: 1, name: 'Kampala City Center' },
        { lat: 0.0512, lng: 32.4467, id: 2, name: 'Entebbe' },
        { lat: 0.4478, lng: 33.2032, id: 3, name: 'Jinja' },
        { lat: 2.7744, lng: 32.2990, id: 4, name: 'Gulu' },
        { lat: 0.6074, lng: 30.2737, id: 5, name: 'Fort Portal' },
        { lat: -0.6072, lng: 30.6545, id: 6, name: 'Mbarara' },
        { lat: 1.0785, lng: 34.1815, id: 7, name: 'Mbale' },
        { lat: 3.0303, lng: 30.9073, id: 8, name: 'Arua' },
        { lat: 1.6735, lng: 31.4004, id: 9, name: 'Hoima' },
        { lat: 0.1187, lng: 30.0158, id: 10, name: 'Kasese' },
        { lat: 1.3533, lng: 32.2933, id: 11, name: 'Masindi' },
        { lat: 1.7133, lng: 33.6133, id: 12, name: 'Soroti' },
        { lat: 2.2500, lng: 32.9000, id: 13, name: 'Lira' },
        { lat: 0.0333, lng: 31.7333, id: 14, name: 'Masaka' },
        { lat: -1.2500, lng: 29.9833, id: 15, name: 'Kabale' },
        // Added Kampala specific neighborhoods
        { lat: 0.3341, lng: 32.5761, id: 16, name: 'Wandegeya' },
        { lat: 0.3267, lng: 32.5861, id: 17, name: 'Nakasero' },
        { lat: 0.3444, lng: 32.5986, id: 18, name: 'Kololo' },
        { lat: 0.3551, lng: 32.5375, id: 19, name: 'Kasubi' },
        { lat: 0.3951, lng: 32.5575, id: 20, name: 'Kisaasi' },
        { lat: 0.3051, lng: 32.6275, id: 21, name: 'Muyenga' },
        { lat: 0.3601, lng: 32.6105, id: 22, name: 'Ntinda' },
        { lat: 0.2801, lng: 32.6105, id: 23, name: 'Kansanga' },
      ];

      for (let h = 0; h < 24; h++) {
        const time = new Date(now.getTime() - h * 3600000);
        stations.forEach(s => {
          // Add some variance based on time of day
          const hour = time.getHours();
          const basePM = 25 + Math.random() * 20;
          const trafficFactor = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20) ? 1.8 : 1.0;
          
          mock.push({
            device_number: s.id,
            site_name: s.name,
            time: time.toISOString(),
            pm2_5: { value: basePM * trafficFactor },
            location: {
              latitude: { value: s.lat + (Math.random() - 0.5) * 0.01 }, // slightly more spread
              longitude: { value: s.lng + (Math.random() - 0.5) * 0.01 }
            }
          });
        });
      }
      return mock;
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [onLoadingChange]);

  // Initialize Clusterer
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    
    // Only create one clusterer instance if map is present and google maps is loaded
    try {
      if (!clusterer.current) {
        clusterer.current = new MarkerClusterer({ map });
      } else {
        clusterer.current.setMap(map);
      }
    } catch (e) {
      console.error('Error initializing MarkerClusterer:', e);
    }
    
    return () => {
      if (clusterer.current) {
        try {
          clusterer.current.clearMarkers();
          clusterer.current.setMap(null);
        } catch (e) {
          // ignore cleanup errors on unmount
        }
      }
    };
  }, [map]);

  // Update Clusters
  useEffect(() => {
    if (clusterer.current && map) {
      try {
        clusterer.current.clearMarkers();
        if (viewMode === 'markers') {
          const markerList = Object.values(markers);
          if (markerList.length > 0) {
            clusterer.current.addMarkers(markerList);
          }
        }
      } catch (e) {
        console.error('Error updating markers in clusterer:', e);
      }
    }
  }, [markers, viewMode, map]);

  const setMarkerRef = (marker: Marker | null, key: string) => {
    if (marker && markers[key] !== marker) {
      setMarkers(prev => ({ ...prev, [key]: marker }));
    }
  };

  if (!map) return null;

  return (
    <>
      <HeatmapOverlay 
        data={currentSnapshot} 
        visible={viewMode === 'heatmap'} 
        timeIndex={timeIndex}
        isForecastMode={isForecastMode}
      />

      <NeighborhoodOverlay 
        visible={viewMode === 'neighborhoods'} 
        grids={grids}
      />
      
      {viewMode === 'markers' && currentSnapshot.map((point, index) => {
        const key = `${point.device_number}-${index}`;
        const status = getAQIStatus(point.pm2_5.value);
        
        return (
          <AdvancedMarker
            key={key}
            position={{
              lat: point.location.latitude.value,
              lng: point.location.longitude.value
            }}
            ref={(marker) => setMarkerRef(marker, key)}
            onClick={() => setSelectedPoint(point)}
          >
            <AirQualityPin status={status} pm25={point.pm2_5.value} />
          </AdvancedMarker>
        );
      })}

      {selectedPoint && (
        <InfoWindow
          position={{
            lat: selectedPoint.location.latitude.value,
            lng: selectedPoint.location.longitude.value
          }}
          onCloseClick={() => setSelectedPoint(null)}
        >
          {(() => {
            const status = getAQIStatus(selectedPoint.pm2_5.value);
            return (
              <div className="p-4 min-w-[260px] font-sans bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sensor Location</p>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {selectedPoint.site_name || "Regional Monitor"}
                    </h3>
                  </div>
                  <span className="text-3xl filter drop-shadow-sm">{status.emoji}</span>
                </div>
                
                <div className={cn(
                  "p-4 rounded-2xl border mb-4",
                  status.level === 'good' ? "bg-green-50 border-green-100 text-green-900 shadow-sm shadow-green-100" :
                  status.level === 'bad' ? "bg-orange-50 border-orange-100 text-orange-900 shadow-sm shadow-orange-100" :
                  "bg-red-50 border-red-100 text-red-900 shadow-sm shadow-red-100"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-black uppercase tracking-wider">
                      {status.label}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold leading-relaxed opacity-80">
                    {status.advice}
                  </p>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">PM 2.5</p>
                    <p className="text-lg font-black text-slate-700 leading-none">{selectedPoint.pm2_5.value.toFixed(1)} <span className="text-[10px] font-bold text-slate-400 uppercase">µg/m³</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Status</p>
                    <div className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                      status.level === 'good' ? "bg-green-500 text-white" :
                      status.level === 'bad' ? "bg-orange-500 text-white" : "bg-red-600 text-white"
                    )}>
                      {status.level}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </InfoWindow>
      )}
    </>
  );
}
