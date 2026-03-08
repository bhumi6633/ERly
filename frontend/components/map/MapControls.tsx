"use client";

import { useState, useEffect, useCallback, memo } from "react";
import {
  PlusIcon,
  MinusIcon,
  InfoCircledIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { Sun, Moon, Radio } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface MapControlsProps {
  map: mapboxgl.Map | null;
}

export const MapControls = memo(function MapControls({ map }: MapControlsProps) {
  const [is2D, setIs2D] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [zoom, setZoom] = useState(1.5);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mapLightMode, setMapLightMode] = useState(true); // true = day (default), false = night
  const [showTraffic, setShowTraffic] = useState(false);

  useEffect(() => {
    if (!map) return;

    const updateState = () => {
      setBearing(Math.round(map.getBearing()));
      setZoom(Math.round(map.getZoom() * 10) / 10);
      setIs2D(map.getPitch() < 1);
    };

    map.on("move", updateState);
    map.on("pitch", updateState);
    map.on("rotate", updateState);
    map.on("zoom", updateState);

    updateState();

    return () => {
      map.off("move", updateState);
      map.off("pitch", updateState);
      map.off("rotate", updateState);
      map.off("zoom", updateState);
    };
  }, [map]);

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    map.zoomIn({ duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    map.zoomOut({ duration: 300 });
  }, [map]);

  const handleResetNorth = useCallback(() => {
    if (!map) return;
    map.easeTo({ bearing: 0, duration: 500 });
  }, [map]);

  const handleToggle2D = useCallback(() => {
    if (!map) return;
    // Read current pitch directly from map to avoid stale closure
    const currentPitch = map.getPitch();
    const shouldGoFlat = currentPitch > 1;
    setIs2D(shouldGoFlat);
    map.easeTo({
      pitch: shouldGoFlat ? 0 : 45,
      duration: 500,
    });
  }, [map]);

  const handleToggleMapTheme = useCallback(() => {
    if (!map) return;
    const next = !mapLightMode;
    setMapLightMode(next);
    try {
      map.setConfigProperty("basemap", "lightPreset", next ? "day" : "night");
    } catch {
      // ignore if basemap not ready
    }
  }, [map, mapLightMode]);

  const handleToggleTraffic = useCallback(() => {
    if (!map) return;
    const next = !showTraffic;
    setShowTraffic(next);
    try {
      if (next) {
        // Add traffic source + layer lazily on first activation
        if (!map.getSource('mapbox-traffic')) {
          map.addSource('mapbox-traffic', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-traffic-v1',
          });
        }
        if (!map.getLayer('traffic')) {
          map.addLayer({
            id: 'traffic',
            type: 'line',
            source: 'mapbox-traffic',
            'source-layer': 'traffic',
            paint: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              'line-color': ['match', ['get', 'congestion'] as any,
                'low',      '#22C55E',
                'moderate', '#FBBF24',
                'heavy',    '#F87171',
                'severe',   '#DC2626',
                '#94a3b8',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ] as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 14, 3.5] as any,
              'line-opacity': 0.85,
            },
          });
        } else {
          map.setLayoutProperty('traffic', 'visibility', 'visible');
        }
      } else {
        if (map.getLayer('traffic')) {
          map.setLayoutProperty('traffic', 'visibility', 'none');
        }
      }
    } catch { /* ignore */ }
  }, [map, showTraffic]);

  return (
    <Tooltip.Provider delayDuration={0}>
      {/* Bottom left: traffic toggle + light/dark map toggle */}
      <div className="absolute left-4 bottom-8 z-20 flex flex-row items-center gap-2">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={handleToggleTraffic}
              className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-200 ${
                showTraffic
                  ? "border-amber-500/50 text-amber-400 bg-amber-500/15 hover:bg-amber-500/20"
                  : "border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10"
              }`}
              aria-label={showTraffic ? "Hide traffic" : "Show live traffic"}
            >
              <Radio width={18} height={18} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content
            className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
            side="top"
            sideOffset={5}
          >
            {showTraffic ? "Hide traffic" : "Live traffic"}
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={handleToggleMapTheme}
              className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-200 ${
                mapLightMode
                  ? "border-blue-500/40 text-blue-500 hover:text-blue-400 hover:bg-blue-500/15"
                  : "border-white/8 text-white/80 hover:text-white hover:bg-white/10"
              }`}
              aria-label={mapLightMode ? "Switch to dark map" : "Switch to light map"}
            >
              {mapLightMode ? (
                <Moon width={18} height={18} />
              ) : (
                <Sun width={18} height={18} />
              )}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content
            className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
            side="top"
            sideOffset={5}
          >
            {mapLightMode ? "Dark map" : "Light map"}
          </Tooltip.Content>
        </Tooltip.Root>
      </div>

      {/* Bottom right: zoom, 2D/3D, compass (N), shortcuts */}
      <div
        data-tutorial="map-controls"
        className="absolute right-4 bottom-8 z-20 flex flex-col-reverse items-end gap-2"
      >
        <div className="flex flex-row items-center gap-2">
          <div className="flex flex-row items-center rounded-xl glass overflow-hidden">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={handleZoomOut}
                  className="p-3 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <MinusIcon width={18} height={18} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
                side="top"
                sideOffset={5}
              >
                Zoom out
              </Tooltip.Content>
            </Tooltip.Root>

            <div className="px-2 text-white/50 text-xs font-medium min-w-10 text-center border-x border-white/10">
              {zoom.toFixed(1)}
            </div>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={handleZoomIn}
                  className="p-3 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <PlusIcon width={18} height={18} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
                side="top"
                sideOffset={5}
              >
                Zoom in
              </Tooltip.Content>
            </Tooltip.Root>
          </div>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={handleToggle2D}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 border ${!is2D
                    ? "bg-white/20 text-white border-white/20"
                    : "bg-black/40 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
                  } backdrop-blur-xl`}
              >
                {is2D ? "2D" : "3D"}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
              side="top"
              sideOffset={5}
            >
              Switch to {is2D ? "3D" : "2D"} view
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={handleResetNorth}
                className="relative p-2.5 rounded-xl glass text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                style={{ transform: `rotate(${-bearing}deg)` }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon
                    points="12,2 19,21 12,17 5,21"
                    fill="currentColor"
                    opacity="0.3"
                  />
                  <polygon
                    points="12,2 12,17 5,21"
                    fill="#ef4444"
                    opacity="0.9"
                  />
                  <polygon
                    points="12,2 19,21 12,17"
                    fill="white"
                    opacity="0.9"
                  />
                </svg>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
              side="top"
              sideOffset={5}
            >
              Reset to north ({Math.round(bearing)}°)
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-200 ${showShortcuts
                    ? "bg-white/20 text-white border-white/20"
                    : "bg-black/40 text-white/60 border-white/[0.08] hover:text-white hover:bg-white/10"
                  }`}
              >
                <InfoCircledIcon width={18} height={18} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
              side="top"
              sideOffset={5}
            >
              Keyboard shortcuts
            </Tooltip.Content>
          </Tooltip.Root>
        </div>

        {showShortcuts && (
          <div className="p-4 rounded-xl glass max-w-70 animate-slideUp">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold text-sm">
                Keyboard shortcuts
              </h4>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <Cross2Icon width={14} height={14} />
              </button>
            </div>
            <p className="text-white/70 text-xs leading-relaxed mb-3">
              Hold{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px]">
                Ctrl
              </kbd>{" "}
              while dragging up and down to change viewing angle.
            </p>
            <p className="text-white/70 text-xs leading-relaxed mb-3">
              Hold{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px]">
                Ctrl
              </kbd>{" "}
              while dragging left and right to rotate.
            </p>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
});
