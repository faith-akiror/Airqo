export type AQILevel = 'good' | 'bad' | 'danger';

export interface AQIStatus {
  level: AQILevel;
  label: string;
  advice: string;
  color: string;
  emoji: string;
}

export const getAQIStatus = (pm25: number): AQIStatus => {
  if (pm25 <= 12) {
    return {
      level: 'good',
      label: 'Good Air',
      advice: 'Air is safe for everyone! Enjoy your day outdoors.',
      color: '#22c55e',
      emoji: '😊',
    };
  }
  if (pm25 <= 35) {
    return {
      level: 'bad',
      label: 'Unhealthy',
      advice: 'Air quality is poor. Sensitive groups should stay inside.',
      color: '#f97316',
      emoji: '😷',
    };
  }
  return {
    level: 'danger',
    label: 'Dangerous',
    advice: 'Very high pollution. Stay indoors and use air filters.',
    color: '#ef4444',
    emoji: '⚠️',
  };
};

export const HEATMAP_COLORS: [number, number, number, number][] = [
  [34, 197, 94, 0],    // #22c55e (0 opacity)
  [34, 197, 94, 120],  // #22c55e (Good)
  [249, 115, 22, 180], // #f97316 (Unhealthy)
  [239, 68, 68, 255],  // #ef4444 (Dangerous)
];
