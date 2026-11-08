import React, { useState, useMemo } from 'react';
import { FoodLocation, UserOrigin } from '../types';
import { getGoogleMapsDirectionsUrl } from '../utils/geo';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  Utensils,
  ExternalLink,
  Globe,
  Trash2,
  Check,
  Pencil,
  Edit3,
  ArrowUpDown,
  Award,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface LocationListProps {
  locations: FoodLocation[];
  selectedLocation: FoodLocation | null;
  onSelectLocation: (location: FoodLocation) => void;
  userOrigin: UserOrigin | null;
  isAdminLoggedIn: boolean;
  onEditLocation?: (location: FoodLocation) => void;
  onDeleteLocation?: (id: string) => void;
  onSuggestEdit?: (location: FoodLocation) => void;
  onScrollToMap: () => void;
}

export const LocationList: React.FC<LocationListProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  userOrigin,
  isAdminLoggedIn,
  onEditLocation,
  onDeleteLocation,
  onSuggestEdit,
  onScrollToMap,
}) => {
  // Sort state: 'newest' | 'distance'
  const [sortBy, setSortBy] = useState<'newest' | 'distance'>('newest');

  // Inline confirmation state for deletion without window.confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sorted Locations memo
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => {
      if (sortBy === 'distance') {
        const distA = a.distanceKm ?? 99999;
        const distB = b.distanceKm ?? 99999;
        return distA - distB;
      }
      // default 'newest'
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [locations, sortBy]);

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5DECE] p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="w-12 h-12 bg-[#FAF7F2] text-[#C86446] rounded-full flex items-center justify-center mx-auto border border-[#E5DECE]">
          <Utensils className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-lg text-[#2C2724]">No food places found</h3>
        <p className="text-xs md:text-sm text-[#7B7268]">
          Try widening your distance radius or searching for a different place.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* List Header with Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5DECE]">
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-[#2C2724]">
            Food Places in Northern Israel
          </h2>
          <p className="text-xs text-[#7B7268]">
            Click any place to inspect on the map or launch Google Maps directions.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#E5DECE] shadow-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#C86446]" />
            <span className="text-xs font-semibold text-[#524B43]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'distance')}
              className="text-xs font-bold text-[#2C2724] bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest">Newly Added</option>
              <option value="distance">Distance (Closest first)</option>
            </select>
          </div>

          <div className="text-xs text-[#5C6B47] font-semibold bg-[#FAF7F2] border border-[#E5DECE] px-3 py-1.5 rounded-xl">
            {sortedLocations.length} {sortedLocations.length === 1 ? 'place' : 'places'}
          </div>
        </div>
      </div>

      {/* Clean Text-and-Badge Location Cards List (No Image) */}
      <div className="space-y-3.5">
        {sortedLocations.map((loc) => {
          const isSelected = selectedLocation?.id === loc.id;
          const isConfirmingDelete = confirmDeleteId === loc.id;

          const directionsUrl = getGoogleMapsDirectionsUrl(
            userOrigin ? userOrigin.lat : null,
            userOrigin ? userOrigin.lng : null,
            loc.lat,
            loc.lng,
            loc.name
          );

          const isUserRec = loc.recommendationType === 'user';

          return (
            <article
              key={loc.id}
              onClick={() => {
                onSelectLocation(loc);
                onScrollToMap();
              }}
              className={`group bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer space-y-3 shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-[#C86446] ring-2 ring-[#C86446]/20 bg-[#FAF7F2]/40'
                  : 'border-[#E5DECE] hover:border-[#C86446]/50'
              }`}
            >
              {/* Top Row: Title, Cost, Recommendation Badge, Kosher Badge */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-display font-bold text-base md:text-xl text-[#2C2724] leading-snug group-hover:text-[#C86446] transition-colors truncate">
                        {loc.name}
                      </h3>

                      {/* Cost Badge */}
                      {loc.cost && (
                        <span className="shrink-0 text-xs font-bold text-[#C86446] bg-[#C86446]/10 px-2.5 py-0.5 rounded border border-[#C86446]/20 font-mono tracking-wider">
                          {loc.cost}
                        </span>
                      )}

                      {/* Recommendation Type Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 border ${
                          isUserRec
                            ? 'bg-[#5C6B47]/10 text-[#5C6B47] border-[#5C6B47]/25'
                            : 'bg-[#C86446]/10 text-[#C86446] border-[#C86446]/25'
                        }`}
                      >
                        {isUserRec ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-[#5C6B47]" />
                            <span>User Recommendation</span>
                          </>
                        ) : (
                          <>
                            <Award className="w-3.5 h-3.5 text-[#C86446]" />
                            <span>Official Recommendation</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#5C6B47] font-medium">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#C86446]" />
                      <span className="truncate">{loc.locationName}</span>
                    </div>
                  </div>

                  {/* Kosher Hechsher Badge */}
                  {loc.hechsher && (
                    <div className="flex items-center gap-1 text-[11px] text-[#5C6B47] bg-[#5C6B47]/10 border border-[#5C6B47]/20 px-2.5 py-0.5 rounded-md shrink-0">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#7B7268]">Kosher:</span>
                      <span className="font-semibold text-[#2C2724]">{loc.hechsher}</span>
                    </div>
                  )}
                </div>

                {/* Distance */}
                {loc.distanceKm !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5C6B47] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E5DECE] w-fit">
                    <MapPin className="w-3.5 h-3.5 text-[#C86446]" />
                    <span className="tabular-nums text-[#2C2724] font-bold">{loc.distanceKm} km away</span>
                  </div>
                )}

                {/* Description */}
                {loc.description && (
                  <p className="text-xs md:text-sm text-[#524B43] leading-relaxed">
                    {loc.description}
                  </p>
                )}

                {/* Metadata: Hours, Phone, Website */}
                {(loc.openingHours || loc.phone || loc.websiteUrl) && (
                  <div className="text-xs text-[#7B7268] flex items-center gap-4 flex-wrap pt-1">
                    {loc.openingHours && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#5C6B47]" />
                        <span>{loc.openingHours}</span>
                      </div>
                    )}
                    {loc.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#5C6B47]" />
                        <a href={`tel:${loc.phone}`} className="hover:underline">{loc.phone}</a>
                      </div>
                    )}
                    {loc.websiteUrl && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-[#5C6B47]" />
                        <a
                          href={loc.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C86446] hover:underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Website / Social Link
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Action Row */}
              <div
                className="pt-3 border-t border-[#F0EBE1] flex items-center justify-between gap-2 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLocation(loc);
                      onScrollToMap();
                    }}
                    className="py-1.5 px-3 text-xs font-semibold text-[#2C2724] bg-[#FAF7F2] hover:bg-[#EFECE6] border border-[#E5DECE] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#C86446]" />
                    <span>View on Map</span>
                  </button>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 opacity-75" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onSuggestEdit?.(loc)}
                    className="py-1.5 px-3 text-xs text-[#7B7268] hover:text-[#C86446] hover:bg-[#FAF7F2] border border-dashed border-[#E5DECE] hover:border-[#C86446]/40 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C86446]" />
                    <span>Suggest Edit</span>
                  </button>
                </div>

                {/* Admin Controls */}
                {isAdminLoggedIn && (
                  <div className="flex items-center gap-1.5">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 p-1 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-[11px] font-semibold text-red-800 pr-1">Confirm delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteLocation) onDeleteLocation(loc.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-[11px] font-medium rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {onEditLocation && (
                          <button
                            type="button"
                            onClick={() => onEditLocation(loc)}
                            className="py-1.5 px-3 text-xs text-[#2C2724] bg-white hover:bg-[#FAF7F2] border border-[#E5DECE] hover:border-[#C86446]/50 rounded-lg flex items-center gap-1 transition-colors font-medium shadow-xs"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#C86446]" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onDeleteLocation && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(loc.id)}
                            className="py-1.5 px-3 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 transition-colors font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
