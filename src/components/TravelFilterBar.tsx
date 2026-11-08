import React, { useState } from 'react';
import { UserOrigin } from '../types';
import { geocodeLocationName } from '../utils/geo';
import { Search, MapPin, Navigation, RotateCcw, Crosshair, Compass, Loader2 } from 'lucide-react';

interface TravelFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  maxDistanceKm: number | null;
  onMaxDistanceChange: (val: number | null) => void;
  userOrigin: UserOrigin | null;
  onSetUserOrigin: (origin: UserOrigin | null) => void;
  onToggleMapPickOrigin: () => void;
  isMapPickingOrigin: boolean;
  isAutoLocating?: boolean;
  totalCount: number;
  filteredCount: number;
}

export const TravelFilterBar: React.FC<TravelFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  maxDistanceKm,
  onMaxDistanceChange,
  userOrigin,
  onSetUserOrigin,
  onToggleMapPickOrigin,
  isMapPickingOrigin,
  isAutoLocating = false,
  totalCount,
  filteredCount,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [typedLocation, setTypedLocation] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const activeLocating = isLocating || isAutoLocating;

  // Request browser GPS
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onSetUserOrigin({
          name: 'Your GPS Location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isGps: true,
        });
        setLocationStatus('GPS location acquired.');
        setTimeout(() => setLocationStatus(null), 3500);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        setLocationStatus('Could not access GPS. Type location or pick on map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Typed Location Geocoding via OpenStreetMap
  const handleTypedLocationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedLocation.trim()) return;

    setIsGeocoding(true);
    setLocationStatus(null);

    const result = await geocodeLocationName(typedLocation);
    setIsGeocoding(false);

    if (result) {
      onSetUserOrigin({
        name: result.name,
        lat: result.lat,
        lng: result.lng,
        isGps: false,
      });
      setLocationStatus(`Origin set to ${result.name}`);
      setTimeout(() => setLocationStatus(null), 3500);
    } else {
      setLocationStatus(`Could not find "${typedLocation}". Try another town or pick on map.`);
    }
  };

  const handleResetFilters = () => {
    onSearchChange('');
    onMaxDistanceChange(null);
  };

  const isFiltered = Boolean(searchQuery) || maxDistanceKm !== null;

  return (
    <div className="bg-white rounded-2xl border border-[#E5DECE] shadow-sm p-4 md:p-6 space-y-4">
      {/* 1. Name Search & 2. Location (GPS or Pick from Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Name Search */}
        <div className="lg:col-span-6 relative">
          <label className="block text-xs font-semibold text-[#524B43] mb-1.5">
            Search by Name
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B7268]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search food place name..."
              className="w-full pl-10 pr-12 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-sm text-[#2C2724] placeholder-[#9E9589] focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7B7268] hover:text-[#2C2724] px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Location (GPS or Pick from Map) */}
        <div className="lg:col-span-6 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#524B43] flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#C86446]" />
              <span>Location:</span>
              <strong className="text-[#2C2724] truncate max-w-[170px] sm:max-w-[220px]">
                {activeLocating ? (
                  <span className="text-[#C86446] animate-pulse">Acquiring GPS...</span>
                ) : userOrigin ? (
                  <span className="flex items-center gap-1">
                    {userOrigin.name}
                    {userOrigin.isGps && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono font-normal">
                        GPS
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-[#9E9589] font-normal italic">Not set</span>
                )}
              </strong>
            </label>
            {userOrigin && (
              <button
                type="button"
                onClick={() => {
                  onSetUserOrigin(null);
                  setTypedLocation('');
                }}
                className="text-[11px] text-[#7B7268] hover:text-[#C86446] underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {/* Type Location Input */}
            <form onSubmit={handleTypedLocationSubmit} className="relative flex-1 flex gap-1.5">
              <input
                type="text"
                value={typedLocation}
                onChange={(e) => setTypedLocation(e.target.value)}
                placeholder="Type location or town..."
                className="w-full pl-3 pr-14 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm text-[#2C2724] placeholder-[#9E9589] focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
              />
              <button
                type="submit"
                disabled={isGeocoding || !typedLocation.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Set'}
              </button>
            </form>

            {/* Pick on Map & GPS Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleMapPickOrigin}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                  isMapPickingOrigin
                    ? 'bg-[#C86446] text-white border-[#C86446] shadow-sm animate-pulse'
                    : 'bg-[#FAF7F2] text-[#2C2724] border-[#E5DECE] hover:bg-[#EFECE6]'
                }`}
                title="Click on the map to set starting location"
              >
                <Compass className="w-3.5 h-3.5 text-[#C86446]" />
                <span>{isMapPickingOrigin ? 'Click Map...' : 'Pick on Map'}</span>
              </button>

              <button
                type="button"
                onClick={handleDetectGps}
                disabled={activeLocating}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5DECE] bg-[#FAF7F2] hover:bg-[#EFECE6] text-[#2C2724] transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Use current device GPS"
              >
                <Navigation className={`w-3.5 h-3.5 text-blue-600 ${activeLocating ? 'animate-spin' : ''}`} />
                <span>{activeLocating ? 'GPS...' : 'GPS'}</span>
              </button>
            </div>
          </div>

          {locationStatus && (
            <p className="text-[11px] text-[#C86446] font-medium pt-0.5 animate-in fade-in">
              {locationStatus}
            </p>
          )}
        </div>
      </div>

      {/* 3. Distance Radius Filter */}
      <div className="pt-3 border-t border-[#F0EBE1] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#2C2724] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#C86446]" />
            <span>Distance Filter</span>
            <span className="text-[10px] text-[#7B7268] font-normal">(only show spots within circle radius)</span>
          </span>
          <span className="font-bold text-[#C86446] tabular-nums">
            {maxDistanceKm !== null ? `Within ${maxDistanceKm} km` : 'Any Distance (Up to 50 km)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={maxDistanceKm ?? 50}
            onChange={(e) => onMaxDistanceChange(Number(e.target.value))}
            className="w-full accent-[#C86446] cursor-pointer h-1.5 bg-[#E5DECE] rounded-lg"
          />
          {maxDistanceKm !== null && (
            <button
              onClick={() => onMaxDistanceChange(null)}
              className="text-[11px] text-[#7B7268] hover:text-[#2C2724] whitespace-nowrap px-2 py-0.5 border border-[#E5DECE] rounded-lg bg-[#FAF7F2] font-semibold"
            >
              Reset Distance
            </button>
          )}
        </div>
        <div className="flex justify-between text-[10px] text-[#9E9589] px-0.5 font-medium">
          <span>5 km</span>
          <span>15 km</span>
          <span>25 km</span>
          <span>35 km</span>
          <span>50 km</span>
        </div>
      </div>

      {/* Results Count & Reset row */}
      {isFiltered && (
        <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between text-xs text-[#7B7268]">
          <span>
            Showing <strong className="text-[#2C2724]">{filteredCount}</strong> of{' '}
            <strong className="text-[#2C2724]">{totalCount}</strong> places
          </span>
          <button
            onClick={handleResetFilters}
            className="text-[#C86446] hover:underline flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
