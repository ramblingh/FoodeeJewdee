import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FoodLocation, UserOrigin } from '../types';
import { getGoogleMapsDirectionsUrl } from '../utils/geo';
import { Navigation, Clock, MapPin, ExternalLink, Compass } from 'lucide-react';

interface NorthernMapProps {
  locations: FoodLocation[];
  selectedLocation: FoodLocation | null;
  onSelectLocation: (location: FoodLocation | null) => void;
  userOrigin: UserOrigin | null;
  radiusKm: number | null;
  adminClickMode?: boolean;
  onAdminCoordsSelected?: (lat: number, lng: number) => void;
  onCancelAdminPick?: () => void;
  adminSelectedCoords?: { lat: number; lng: number } | null;
  originPickMode?: boolean;
  onOriginCoordsSelected?: (lat: number, lng: number) => void;
  onCancelOriginPick?: () => void;
}

// Center of Northern Israel (Mount Meron / Upper Galilee)
const NORTH_ISRAEL_CENTER: [number, number] = [32.95, 35.35];
const DEFAULT_ZOOM = 10;

export const NorthernMap: React.FC<NorthernMapProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  userOrigin,
  radiusKm,
  adminClickMode = false,
  onAdminCoordsSelected,
  onCancelAdminPick,
  adminSelectedCoords,
  originPickMode = false,
  onOriginCoordsSelected,
  onCancelOriginPick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const adminMarkerRef = useRef<L.Marker | null>(null);

  // Maintain fresh refs so Leaflet event listeners always read latest state/callbacks
  const adminClickModeRef = useRef(adminClickMode);
  const onAdminCoordsSelectedRef = useRef(onAdminCoordsSelected);
  const originPickModeRef = useRef(originPickMode);
  const onOriginCoordsSelectedRef = useRef(onOriginCoordsSelected);

  useEffect(() => {
    adminClickModeRef.current = adminClickMode;
    onAdminCoordsSelectedRef.current = onAdminCoordsSelected;
    originPickModeRef.current = originPickMode;
    onOriginCoordsSelectedRef.current = onOriginCoordsSelected;
  }, [adminClickMode, onAdminCoordsSelected, originPickMode, onOriginCoordsSelected]);

  // Initialize Map with strictly OpenStreetMap layer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: NORTH_ISRAEL_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false,
    });

    // Standard OpenStreetMap Layer (100% Free & Open)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Click handler for admin pin selection or user origin map selection using fresh refs
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (adminClickModeRef.current && onAdminCoordsSelectedRef.current) {
        onAdminCoordsSelectedRef.current(e.latlng.lat, e.latlng.lng);
      } else if (originPickModeRef.current && onOriginCoordsSelectedRef.current) {
        onOriginCoordsSelectedRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Cursor when in map-picking mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (adminClickMode || originPickMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [adminClickMode, originPickMode]);

  // Render or Update Dynamic Radius Circle around userOrigin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userOrigin && radiusKm !== null && radiusKm > 0) {
      const radiusMeters = radiusKm * 1000;
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setLatLng([userOrigin.lat, userOrigin.lng]);
        radiusCircleRef.current.setRadius(radiusMeters);
      } else {
        const circle = L.circle([userOrigin.lat, userOrigin.lng], {
          radius: radiusMeters,
          color: '#C86446',
          weight: 2,
          opacity: 0.85,
          dashArray: '6, 6',
          fillColor: '#C86446',
          fillOpacity: 0.12,
        }).addTo(map);

        circle.bindTooltip(`${radiusKm} km search radius`, {
          permanent: false,
          direction: 'top',
          className: 'text-xs font-semibold text-[#C86446]',
        });

        radiusCircleRef.current = circle;
      }
    } else if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
      radiusCircleRef.current = null;
    }
  }, [userOrigin, radiusKm]);

  // Render Admin placement marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (adminSelectedCoords) {
      if (adminMarkerRef.current) {
        adminMarkerRef.current.setLatLng([adminSelectedCoords.lat, adminSelectedCoords.lng]);
      } else {
        const adminIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute -top-1 w-9 h-9 bg-emerald-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white animate-bounce">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>
              </div>
              <div class="absolute top-8 w-2 h-2 bg-emerald-900 rounded-full opacity-60"></div>
            </div>
          `,
          iconSize: [36, 42],
          iconAnchor: [18, 40],
        });

        adminMarkerRef.current = L.marker(
          [adminSelectedCoords.lat, adminSelectedCoords.lng],
          { icon: adminIcon, zIndexOffset: 2000 }
        )
          .addTo(map)
          .bindPopup(
            '<div class="p-2 text-xs font-semibold text-emerald-900">Pin Coordinates Selected!</div>'
          );
      }
    } else if (adminMarkerRef.current) {
      adminMarkerRef.current.remove();
      adminMarkerRef.current = null;
    }
  }, [adminSelectedCoords]);

  // Render User Starting Location Pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userOrigin) {
      const userIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-7 h-7 bg-blue-500 rounded-full opacity-30 animate-ping"></span>
            <span class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userOrigin.lat, userOrigin.lng]);
      } else {
        userMarkerRef.current = L.marker([userOrigin.lat, userOrigin.lng], {
          icon: userIcon,
          zIndexOffset: 1500,
        })
          .addTo(map)
          .bindPopup(
            `<div class="p-2.5 text-xs text-[#2C2724] font-sans">
              <div class="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Starting Location</div>
              <div class="font-semibold text-sm">${userOrigin.name}</div>
            </div>`
          );
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userOrigin]);

  // Update Food Place Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers that no longer exist
    const currentIds = new Set(locations.map((loc) => loc.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    locations.forEach((loc) => {
      const isSelected = selectedLocation?.id === loc.id;
      const googleMapsUrl = getGoogleMapsDirectionsUrl(
        userOrigin ? userOrigin.lat : null,
        userOrigin ? userOrigin.lng : null,
        loc.lat,
        loc.lng,
        loc.name
      );

      const pinColor = isSelected ? '#9E3E26' : '#C86446'; // Terracotta rustic shade
      const pinHtml = `
        <div class="pin-bubble group cursor-pointer relative flex flex-col items-center">
          <div class="relative flex items-center justify-center w-9 h-11 transition-transform">
            <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-md">
              <path d="M18 0C8.05887 0 0 8.05887 0 18C0 29.5 15.5 42.5 17.1 43.8C17.65 44.25 18.35 44.25 18.9 43.8C20.5 42.5 36 29.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${pinColor}"/>
              <circle cx="18" cy="18" r="13" fill="#FFFFFF"/>
            </svg>
            <span class="absolute top-[8px] text-[15px] select-none leading-none">🍽️</span>
          </div>
          <div class="absolute -bottom-1 w-2.5 h-1 bg-black/25 rounded-full blur-[1px]"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: pinHtml,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -42],
      });

      const isUserRec = loc.recommendationType === 'user';
      const recBadge = isUserRec
        ? `<div class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5C6B47] bg-[#5C6B47]/10 px-2 py-0.5 rounded border border-[#5C6B47]/20"><span>👤 User Recommendation</span></div>`
        : `<div class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C86446] bg-[#C86446]/10 px-2 py-0.5 rounded border border-[#C86446]/20"><span>⭐ Official Recommendation</span></div>`;

      const popupHtml = `
        <div class="w-72 bg-white rounded-xl overflow-hidden font-sans">
          <div class="p-3 bg-[#FAF7F2] border-b border-[#E5DECE] flex justify-between items-center gap-2">
            <span class="font-display font-bold text-base text-[#2C2724] leading-tight truncate pr-1">${loc.name}</span>
            ${loc.cost ? `<span class="text-xs font-bold px-2.5 py-1 bg-[#C86446] text-white rounded shadow-xs shrink-0 tracking-wider font-mono">${loc.cost}</span>` : ''}
          </div>
          <div class="p-3.5 space-y-2.5">
            <div>${recBadge}</div>
            <div class="flex items-center gap-1.5 text-xs text-[#5C6B47] font-medium">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${loc.locationName}</span>
            </div>

            ${loc.hechsher ? `
              <div class="flex items-center gap-1.5 text-xs text-[#5C6B47] font-semibold bg-[#5C6B47]/10 border border-[#5C6B47]/20 px-2.5 py-1 rounded-md">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Kosher: <strong class="text-[#2C2724]">${loc.hechsher}</strong></span>
              </div>
            ` : ''}

            ${loc.description ? `<p class="text-xs text-[#524B43] line-clamp-3 leading-relaxed">${loc.description}</p>` : ''}

            ${(loc.openingHours || loc.phone || loc.websiteUrl) ? `
              <div class="space-y-1 text-[11px] text-[#7B7268] pt-1 border-t border-[#F0EBE1]">
                ${loc.openingHours ? `<div class="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${loc.openingHours}</span></div>` : ''}
                ${loc.phone ? `<div class="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><a href="tel:${loc.phone}" class="hover:underline">${loc.phone}</a></div>` : ''}
                ${loc.websiteUrl ? `<div class="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a href="${loc.websiteUrl}" target="_blank" rel="noopener noreferrer" class="text-[#C86446] hover:underline truncate">Website / Social Link</a></div>` : ''}
              </div>
            ` : ''}

            ${loc.distanceKm !== undefined ? `
              <div class="flex items-center justify-between text-xs py-1 border-t border-[#F0EBE1] text-[#2C2724] font-medium">
                <span class="flex items-center gap-1 text-[#5C6B47]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ~${loc.drivingMinutes} min drive
                </span>
                <span class="tabular-nums text-[#7B7268]">${loc.distanceKm} km away</span>
              </div>
            ` : ''}

            <div class="pt-1 flex items-center gap-2">
              <a
                href="${googleMapsUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] rounded-md transition-colors shadow-sm"
              >
                <span>Google Maps Directions</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        </div>
      `;

      if (markersRef.current[loc.id]) {
        // Update existing marker
        markersRef.current[loc.id].setLatLng([loc.lat, loc.lng]);
        markersRef.current[loc.id].setIcon(customIcon);
        markersRef.current[loc.id].setPopupContent(popupHtml);
      } else {
        // Create new marker
        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 300, minWidth: 260, autoPan: false });

        marker.on('click', (e: L.LeafletMouseEvent) => {
          if (adminClickModeRef.current && onAdminCoordsSelectedRef.current) {
            L.DomEvent.stopPropagation(e);
            onAdminCoordsSelectedRef.current(loc.lat, loc.lng);
            return;
          }
          if (originPickModeRef.current && onOriginCoordsSelectedRef.current) {
            L.DomEvent.stopPropagation(e);
            onOriginCoordsSelectedRef.current(loc.lat, loc.lng);
            return;
          }
          centerOnBubble(loc);
          onSelectLocation(loc);
        });

        markersRef.current[loc.id] = marker;
      }
    });
  }, [locations, selectedLocation, userOrigin]);

  // Center on information bubble above pin
  const centerOnBubble = (loc: FoodLocation) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const targetZoom = Math.max(map.getZoom(), 13);
    // Project pin latlng to pixel coordinates at targetZoom, then offset vertically
    // (~145px upwards) so that the entire information bubble is vertically centered
    const pinPoint = map.project([loc.lat, loc.lng], targetZoom);
    const bubblePoint = L.point(pinPoint.x, pinPoint.y - 145);
    const bubbleLatLng = map.unproject(bubblePoint, targetZoom);

    map.flyTo(bubbleLatLng, targetZoom, {
      duration: 0.8,
      easeLinearity: 0.25,
    });

    const marker = markersRef.current[loc.id];
    if (marker && !marker.isPopupOpen()) {
      setTimeout(() => {
        marker.openPopup();
      }, 250);
    }
  };

  // Center on selected location bubble when selected externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocation) return;
    centerOnBubble(selectedLocation);
  }, [selectedLocation]);

  return (
    <div className="relative w-full h-[430px] md:h-[530px] rounded-2xl overflow-hidden border border-[#E5DECE] shadow-sm bg-[#EFECE6]">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Admin Mode Overlay Banner */}
      {adminClickMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-800 text-white px-4 py-2.5 rounded-full shadow-2xl text-xs md:text-sm font-semibold flex items-center gap-2.5 border border-emerald-400">
          <Compass className="w-4 h-4 text-emerald-300 animate-spin" />
          <span>Click anywhere on the map to set place location!</span>
          {onCancelAdminPick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelAdminPick();
              }}
              className="ml-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* User Origin Picker Mode Overlay Banner */}
      {originPickMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#C86446] text-white px-4 py-2.5 rounded-full shadow-2xl text-xs md:text-sm font-semibold flex items-center gap-2.5 border border-amber-300">
          <MapPin className="w-4 h-4 text-amber-200 animate-bounce" />
          <span>Click anywhere on the map to set starting origin!</span>
          {onCancelOriginPick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelOriginPick();
              }}
              className="ml-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
