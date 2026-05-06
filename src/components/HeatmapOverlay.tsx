import { useEffect, useMemo, useState, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { HEATMAP_COLORS } from '../lib/aqi';

export interface AirQualityData {
  device_number: number;
  site_name?: string;
  pm2_5: {
    value: number;
  };
  location: {
    latitude: { value: number };
    longitude: { value: number };
  };
  time: string;
}

interface HeatmapOverlayProps {
  data: AirQualityData[];
  visible: boolean;
  timeIndex: number;
  isForecastMode: boolean;
}

export function HeatmapOverlay({ data, visible, timeIndex, isForecastMode }: HeatmapOverlayProps) {
  const map = useMap();
  const [drift, setDrift] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);

  // 1. Group data by hour
  const timeGroupedData = useMemo(() => {
    if (!data.length) return {};
    const groups: Record<string, AirQualityData[]> = {};
    
    data.forEach(point => {
      const date = new Date(point.time);
      const hourKey = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      if (!groups[hourKey]) groups[hourKey] = [];
      groups[hourKey].push(point);
    });
    
    return groups;
  }, [data]);

  const timeKeys = useMemo(() => Object.keys(timeGroupedData).sort(), [timeGroupedData]);
  
  // 2. Add subtle "Smoke Drift" animation
  useEffect(() => {
    let frame: number;
    const animate = (t: number) => {
      // Slower drift updates
      setDrift({
        x: Math.sin(t / 4000) * 0.001,
        y: Math.cos(t / 5000) * 0.001,
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // 3. Prepare display data (current snapshot + drift)
  const animatedData = useMemo(() => {
    if (!visible || timeKeys.length === 0) return [];
    
    const index = isForecastMode ? timeKeys.length - 1 : (timeIndex % timeKeys.length);
    const key = timeKeys[index];
    const snapshot = timeGroupedData[key] || [];
    
    return snapshot.map(p => ({
      ...p,
      location: {
        latitude: { value: p.location.latitude.value + drift.y },
        longitude: { value: p.location.longitude.value + drift.x }
      }
    }));
  }, [timeGroupedData, timeKeys, timeIndex, visible, drift, isForecastMode]);

  const layers = useMemo(() => {
    if (!visible || animatedData.length === 0) return [];

    return [
      new HeatmapLayer({
        id: 'air-quality-heatmap',
        data: animatedData,
        getPosition: (d: any) => [d.location.longitude.value, d.location.latitude.value],
        getWeight: (d: any) => d.pm2_5.value,
        radiusPixels: 80,
        intensity: 1.5,
        threshold: 0.03,
        colorRange: HEATMAP_COLORS,
        aggregation: 'MEAN',
      }),
    ];
  }, [animatedData, visible]);

  useEffect(() => {
    if (!map) return;

    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({ layers });
      overlayRef.current.setMap(map);
    } else {
      overlayRef.current.setProps({ layers });
    }

    // Handle visibility
    if (!visible && overlayRef.current) {
      overlayRef.current.setProps({ layers: [] });
    }
  }, [map, layers, visible]);

  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, []);

  return null;
}
