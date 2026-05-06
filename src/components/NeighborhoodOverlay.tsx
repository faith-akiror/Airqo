import { useMemo, useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer } from '@deck.gl/layers';
import { getAQIStatus } from '../lib/aqi';

interface GridData {
  _id: string;
  name: string;
  shape: any;
  aqi?: number; // Some grids might have pre-calculated average
}

interface NeighborhoodOverlayProps {
  visible: boolean;
  grids: GridData[];
}

export function NeighborhoodOverlay({ visible, grids }: NeighborhoodOverlayProps) {
  const map = useMap();
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);

  const layers = useMemo(() => {
    if (!visible || !grids.length) return [];

    return [
      new GeoJsonLayer({
        id: 'neighborhoods-layer',
        data: grids.map(g => ({
          type: 'Feature',
          geometry: g.shape,
          properties: {
            name: g.name,
            aqi: g.aqi || 25, // Fallback for demo if not present
          }
        })),
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: (d: any) => {
          const status = getAQIStatus(d.properties.aqi);
          // Convert hex to [r,g,b,a]
          const r = parseInt(status.color.slice(1, 3), 16);
          const g = parseInt(status.color.slice(3, 5), 16);
          const b = parseInt(status.color.slice(5, 7), 16);
          return [r, g, b, 100];
        },
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
      })
    ];
  }, [visible, grids]);

  useEffect(() => {
    if (!map) return;

    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({ layers });
      overlayRef.current.setMap(map);
    } else {
      overlayRef.current.setProps({ layers });
    }

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
