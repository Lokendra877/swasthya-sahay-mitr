import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Phone, Navigation, Hospital, Pill, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/nearby")({
  component: Nearby,
});

type Place = {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  international_phone_number?: string;
  formatted_phone_number?: string;
  type: "hospital" | "pharmacy" | "doctor";
  distance?: number;
};

type Filter = "hospital" | "pharmacy" | "doctor";

function loadGoogleMaps(apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) return resolve((window as any).google);
    const existing = document.getElementById("gmaps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).google));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.id = "gmaps-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve((window as any).google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function Nearby() {
  const { lang } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [filter, setFilter] = useState<Filter>("hospital");
  const [places, setPlaces] = useState<Place[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Load map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("maps-key");
        if (error) throw error;
        if (!data?.key) throw new Error("Missing Maps API key");
        const g = await loadGoogleMaps(data.key);

        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        }).catch(() => null);

        const center = pos
          ? { lat: pos.coords.latitude, lng: pos.coords.longitude }
          : { lat: 28.6139, lng: 77.209 }; // New Delhi fallback
        if (cancelled) return;
        setCoords(center);

        mapInstance.current = new g.maps.Map(mapRef.current!, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
        });
        new g.maps.Marker({
          position: center,
          map: mapInstance.current,
          title: "You",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#1f78ff",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
      } catch (e: any) {
        setErr(e.message ?? "Failed to load map");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Search places when filter changes & map ready
  useEffect(() => {
    if (!coords || !mapInstance.current) return;
    const g = (window as any).google;
    if (!g) return;
    const service = new g.maps.places.PlacesService(mapInstance.current);
    service.nearbySearch(
      {
        location: coords,
        radius: 5000,
        type: filter,
      },
      (results: any[], status: string) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !results) {
          setPlaces([]);
          return;
        }
        // Clear markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        const enriched: Place[] = results.slice(0, 15).map((r) => ({
          place_id: r.place_id,
          name: r.name,
          vicinity: r.vicinity,
          geometry: { location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() } },
          rating: r.rating,
          user_ratings_total: r.user_ratings_total,
          type: filter,
          distance: distanceKm(coords, {
            lat: r.geometry.location.lat(),
            lng: r.geometry.location.lng(),
          }),
        }));
        enriched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        setPlaces(enriched);
        enriched.forEach((p) => {
          const m = new g.maps.Marker({
            position: p.geometry.location,
            map: mapInstance.current,
            title: p.name,
          });
          markersRef.current.push(m);
        });
      }
    );
  }, [coords, filter]);

  return (
    <MobileShell>
      <h2 className="mb-3 text-lg font-bold">{t("nearby", lang)}</h2>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Column: Controls & List */}
        <div className="flex-1 lg:max-w-md">
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip active={filter === "hospital"} onClick={() => setFilter("hospital")} icon={Hospital}>
              {lang === "hi" ? "अस्पताल" : "Hospitals"}
            </Chip>
            <Chip active={filter === "doctor"} onClick={() => setFilter("doctor")} icon={Stethoscope}>
              {lang === "hi" ? "क्लीनिक" : "Clinics"}
            </Chip>
            <Chip active={filter === "pharmacy"} onClick={() => setFilter("pharmacy")} icon={Pill}>
              {lang === "hi" ? "फार्मेसी" : "Pharmacy"}
            </Chip>
          </div>

          <div className="space-y-3 overflow-y-auto lg:max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
            {places.map((p) => (
              <Card key={p.place_id} className="rounded-2xl p-4 transition-all hover:border-primary/50 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold">{p.name}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.vicinity}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {p.distance ? `${p.distance.toFixed(1)} km` : ""}
                      </div>
                      {p.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500">★</span>
                          <span>{p.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0 rounded-xl"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${p.geometry.location.lat},${p.geometry.location.lng}`,
                        "_blank"
                      )
                    }
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
            {!loading && !err && places.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {lang === "hi" ? "कुछ नहीं मिला।" : "No places found nearby."}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Map */}
        <div className="flex-[2]">
          <Card className="sticky top-24 overflow-hidden rounded-3xl shadow-xl">
            <div ref={mapRef} className="h-80 w-full bg-muted md:h-[500px] lg:h-[600px]" />
          </Card>
          {loading && (
            <p className="mt-4 text-center text-sm text-muted-foreground animate-pulse">
              {lang === "hi" ? "नक्शा लोड हो रहा है…" : "Loading map…"}
            </p>
          )}
          {err && (
            <Card className="mt-3 border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {err}
              </div>
            </Card>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function Chip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
