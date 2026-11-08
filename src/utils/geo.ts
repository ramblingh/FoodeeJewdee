/**
 * Geolocation, driving calculation, and geocoding utilities for Northern Israel
 * Uses OpenStreetMap for map visualization & Nominatim for free location search
 * Opens Google Maps for driving directions
 */

/**
 * Calculates straight line distance using Haversine formula in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates realistic driving time in minutes through Northern Israel's road topology
 * (accounting for Galilee mountain curves, Golan plateaus, and valley highways).
 */
export function estimateDrivingTimeMinutes(distanceKm: number): number {
  if (distanceKm <= 0.2) return 1;
  if (distanceKm <= 1.5) return 4;

  // Winding factor for Galilee/Golan mountain roads (typically 1.25x - 1.35x aerial distance)
  const estimatedRoadKm = distanceKm * 1.28;

  // Average traffic speed: slower for local mountain ascents, faster for Route 90/85/77 corridors
  let avgSpeedKmh = 50;
  if (distanceKm > 15) {
    avgSpeedKmh = 68;
  }
  if (distanceKm > 35) {
    avgSpeedKmh = 76;
  }

  const minutes = Math.round((estimatedRoadKm / avgSpeedKmh) * 60) + 2;
  return Math.max(3, minutes);
}

/**
 * Generates Google Maps turn-by-turn driving directions URL
 */
export function getGoogleMapsDirectionsUrl(
  originLat: number | null,
  originLng: number | null,
  destLat: number,
  destLng: number,
  destName: string
): string {
  const encodedName = encodeURIComponent(destName);
  if (originLat !== null && originLng !== null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}+(${encodedName})`;
}

/**
 * Free geocoding using OpenStreetMap Nominatim for Northern Israel / Israel
 */
export async function geocodeLocationName(
  query: string
): Promise<{ name: string; lat: number; lng: number } | null> {
  if (!query || query.trim().length < 2) return null;
  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${cleanQuery}&countrycodes=il&limit=1`,
      {
        headers: {
          'Accept-Language': 'en,he',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      const first = data[0];
      return {
        name: first.display_name.split(',')[0] || query,
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      };
    }
  } catch (err) {
    console.warn('Geocoding search error:', err);
  }
  return null;
}

/**
 * Free reverse geocoding using OpenStreetMap Nominatim
 * Resolves coordinates to a readable street or town name
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en,he',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const addr = data.address;
      const road = addr.road || addr.pedestrian || addr.suburb || '';
      const town = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      if (road && town) return `${road}, ${town}`;
      if (town) return town;
      if (data.name) return data.name;
    }
    if (data && data.display_name) {
      return data.display_name.split(',').slice(0, 2).join(',').trim();
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }
  return null;
}
