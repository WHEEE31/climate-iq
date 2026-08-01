import { useRef, useEffect, useState, Component, type ReactNode } from "react";
import maplibregl from "maplibre-gl";
import { MapPin, Loader2, Globe as GlobeIcon } from "lucide-react";

// ─── Error boundary ───────────────────────────────────────────────────────────
class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { errored: boolean }
> {
  state = { errored: false };
  static getDerivedStateFromError() { return { errored: true }; }
  render() { return this.state.errored ? this.props.fallback : this.props.children; }
}

// ─── CARTO Dark Matter — free, no key, global vector tiles ───────────────────
const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ─── Custom pin element ───────────────────────────────────────────────────────
function makePinElement(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.716 0 0 6.716 0 15C0 25.5 15 38 15 38C15 38 30 25.5 30 15C30 6.716 23.284 0 15 0Z" fill="#f43f5e"/>
    <circle cx="15" cy="15" r="5.5" fill="white"/>
  </svg>`;
  el.style.cursor = "default";
  return el;
}

// ─── Inner map (rendered inside error boundary) ───────────────────────────────
function GlobeMap({
  onLocationSelect,
  hasSelection,
  onSelectionStatusChange,
}: {
  onLocationSelect: (addr: string) => void;
  hasSelection: boolean;
  onSelectionStatusChange: (state: { isValid: boolean; message: string | null; address: string | null }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const markerRef    = useRef<maplibregl.Marker | null>(null);
  // Stable callback ref — never stale inside the click handler
  const onSelectRef  = useRef(onLocationSelect);
  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [warning, setWarning]         = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [10, 20],
      zoom: 1.8,
      minZoom: 1,
      attributionControl: false,
      fadeDuration: 0,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      // setProjection and setFog are optional across maplibre-gl versions and
      // builds. Feature-detect through a widened type rather than a
      // @ts-expect-error directive: the directive itself becomes a compile
      // error the moment the method IS present in the installed typings.
      const optional = map as maplibregl.Map & {
        setProjection?: (spec: unknown) => void;
        setFog?: (spec: unknown) => void;
      };

      // ── Globe projection ─────────────────────────────────────────────────
      try {
        optional.setProjection?.({ type: "globe" });
      } catch { /* flat Mercator is a fine fallback */ }

      // ── Space atmosphere ─────────────────────────────────────────────────
      try {
        optional.setFog?.({
          range: [0.8, 8],
          color: "#1a2035",
          "high-color": "#243b6e",
          "horizon-blend": 0.03,
          "space-color": "#04060f",
          "star-intensity": 0.55,
        });
      } catch { /* fog API differs across builds */ }

      // Water and ocean areas are left as the natural CARTO dark-blue style.
      // All land areas worldwide are supported (Open-Meteo covers the full globe).
    });

    // ── Click handler ─────────────────────────────────────────────────────────
    map.on("click", async (e) => {
      const { lat, lng } = e.lngLat;
      setWarning(null);
      setIsGeocoding(true);

      try {
        const resp = await fetch(
          `/api/reverse-geocode?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`
        );
        if (!resp.ok) {
          throw new Error(`reverse geocode failed with ${resp.status}`);
        }

        const data = (await resp.json()) as {
          address: string | null;
          countryCode: string | null;
        };

        // Only accept clicks that resolve to a land area with coverage.
        if (!data.countryCode || !data.address) {
          setWarning("Please click a land area with coverage.");
          onSelectionStatusChange({ isValid: false, message: "Click land to select a location.", address: null });
          setIsGeocoding(false);
          return;
        }

        // Drop / replace the pin
        markerRef.current?.remove();
        markerRef.current = new maplibregl.Marker({ element: makePinElement(), anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(map);

        // Fly to location
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 6), duration: 900, essential: true });

        const selectedAddress = data.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onSelectRef.current(selectedAddress);
        onSelectionStatusChange({ isValid: true, message: null, address: selectedAddress });
      } catch {
        setWarning("Please click a land area with coverage.");
        onSelectionStatusChange({ isValid: false, message: "Click land to select a location.", address: null });
      } finally {
        setIsGeocoding(false);
      }
    });

    map.on("mousemove", () => { map.getCanvas().style.cursor = "crosshair"; });

    mapRef.current = map;
    return () => { markerRef.current?.remove(); map.remove(); };
  }, []); // created once

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />

      {/* Status pills */}
      {!hasSelection && !isGeocoding && !warning && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full text-xs text-white/75 select-none whitespace-nowrap">
          <MapPin className="w-3 h-3 shrink-0" />
          Click any land area to drop a pin
        </div>
      )}
      {isGeocoding && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full text-xs text-white/75 select-none whitespace-nowrap">
          <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
          Looking up address…
        </div>
      )}
      {warning && !isGeocoding && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-950/80 backdrop-blur-sm border border-red-500/40 px-4 py-2 rounded-full text-xs text-red-300 select-none whitespace-nowrap">
          <MapPin className="w-3 h-3 shrink-0" />
          {warning}
        </div>
      )}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export function GlobeSelector({
  onLocationSelect,
  hasSelection,
  onSelectionStatusChange,
}: {
  onLocationSelect: (address: string) => void;
  hasSelection: boolean;
  onSelectionStatusChange: (state: { isValid: boolean; message: string | null; address: string | null }) => void;
}) {
  return (
    <div className="relative w-full h-[360px] md:h-[480px] overflow-hidden rounded-2xl border border-border/30">
      <MapErrorBoundary
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-secondary/20">
            <GlobeIcon className="w-10 h-10 opacity-30" />
            <p className="text-sm opacity-60">Interactive map unavailable in this environment</p>
          </div>
        }
      >
        <GlobeMap onLocationSelect={onLocationSelect} hasSelection={hasSelection} onSelectionStatusChange={onSelectionStatusChange} />
      </MapErrorBoundary>
    </div>
  );
}
