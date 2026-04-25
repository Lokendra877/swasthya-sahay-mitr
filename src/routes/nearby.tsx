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

      <div className="mb-3 flex gap-2">
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

      <Card className="overflow-hidden rounded-2xl">
        <div ref={mapRef} className="h-56 w-full bg-muted" />
      </Card>

      {loading && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {lang === "hi" ? "नक्शा लोड हो रहा है…" : "Loading map…"}
        </p>
      )}
      {err && (
        <Card className="mt-3 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{err}</Card>
      )}

      <div className="mt-4 space-y-2">
        {places.map((p) => (
          <Card key={p.place_id} className="rounded-2xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{p.vicinity}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {p.distance ? `${p.distance.toFixed(1)} km` : ""}
                  {p.rating ? ` • ★ ${p.rating}` : ""}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 rounded-lg"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${p.geometry.location.lat},${p.geometry.location.lng}`,
                      "_blank"
                    )
                  }
                >
                  <Navigation className="mr-1 h-3 w-3" /> {t("directions", lang)}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!loading && !err && places.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {lang === "hi" ? "कुछ नहीं मिला।" : "No places found nearby."}
          </p>
        )}
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
