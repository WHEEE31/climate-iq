import { logger } from "../logger";

export interface GeocodedLocation {
  lat: number;
  lng: number;
  normalizedAddress: string;
  county: string;
  state: string;
  stateCode: string;
  fips: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2 uppercase
  isUS: boolean;
}

/**
 * Geocode an address (or a "lat, lng" coordinate string) using Nominatim.
 * Free, no API key required, global coverage.
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodedLocation | null> {
  // ── 1. Detect bare coordinate input ("lat, lng") from globe-pin fallback ──
  const coordMatch = address.trim().match(/^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      logger.debug({ lat, lng }, "Input looks like coordinates — using directly");
      return buildLocationFromCoords(lat, lng, address);
    }
  }

  // ── 2. Forward geocode via Nominatim ─────────────────────────────────────
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  logger.debug({ address }, "Geocoding address via Nominatim");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ClimateIQ/1.0 (climate risk assessment; noreply@climateiq.app)",
        "Accept": "application/json",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "Nominatim returned non-200");
      return null;
    }

    const results = await res.json() as NominatimResult[];

    if (!results || results.length === 0) {
      logger.warn({ address }, "No geocoder matches found");
      return null;
    }

    return parseNominatimResult(results[0]);
  } catch (err) {
    logger.error({ err, address }, "Geocoding error");
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    state_code?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNominatimResult(r: NominatimResult): GeocodedLocation {
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  const addr = r.address ?? {};
  const countryCode = (addr.country_code ?? "").toUpperCase();
  const isUS = countryCode === "US";

  // Build a normalised address string
  const parts: string[] = [];
  if (addr.house_number && addr.road) parts.push(`${addr.house_number} ${addr.road}`);
  else if (addr.road) parts.push(addr.road);
  const locality = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? "";
  if (locality) parts.push(locality);
  if (addr.state) parts.push(addr.state);
  if (addr.postcode) parts.push(addr.postcode);
  if (!isUS && addr.country) parts.push(addr.country);

  const normalizedAddress = parts.length > 0 ? parts.join(", ") : r.display_name;

  return {
    lat,
    lng,
    normalizedAddress,
    county: addr.county ?? "",
    state: addr.state ?? "",
    stateCode: addr.state_code ?? addr.state ?? "",
    fips: "", // not available outside US Census data
    country: addr.country ?? "",
    countryCode,
    isUS,
  };
}

/** Minimal location object built from raw coordinates — used when the user
 *  supplies a "lat, lng" string directly (globe pin with no address). */
async function buildLocationFromCoords(
  lat: number,
  lng: number,
  rawInput: string
): Promise<GeocodedLocation> {
  // Try a quick reverse geocode to get the country and a human address
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ClimateIQ/1.0 (climateiq.app)" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json() as { display_name?: string } & NominatimResult;
      if (!data.address?.country_code) {
        // Ocean or unmapped area
        return coordFallback(lat, lng, rawInput);
      }
      return parseNominatimResult({ ...data, lat: String(lat), lon: String(lng) });
    }
  } catch {
    // ignore
  }
  return coordFallback(lat, lng, rawInput);
}

function coordFallback(lat: number, lng: number, rawInput: string): GeocodedLocation {
  return {
    lat,
    lng,
    normalizedAddress: rawInput,
    county: "",
    state: "",
    stateCode: "",
    fips: "",
    country: "",
    countryCode: "",
    isUS: false,
  };
}
