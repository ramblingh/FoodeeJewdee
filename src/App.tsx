import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FoodLocation, UserOrigin, LocationSuggestion, EditSuggestion } from './types';
import { INITIAL_LOCATIONS } from './data/initialLocations';
import { calculateHaversineDistanceKm, estimateDrivingTimeMinutes, reverseGeocodeCoords } from './utils/geo';
import { Header } from './components/Header';
import { NorthernMap } from './components/NorthernMap';
import { TravelFilterBar } from './components/TravelFilterBar';
import { LocationList } from './components/LocationList';
import { AdminModal } from './components/AdminModal';
import { PublicAddLocationModal } from './components/PublicAddLocationModal';
import { SuggestEditModal } from './components/SuggestEditModal';
import { MapPin, Navigation, Compass, CheckCircle2, ShieldAlert, Sparkles, Filter } from 'lucide-react';

const STORAGE_KEY_LOCATIONS = 'northern_eats_locations_v1';
const STORAGE_KEY_AUTH = 'northern_eats_admin_auth_v1';
const STORAGE_KEY_SUGGESTIONS = 'foodie_jewdie_suggestions_v1';
const STORAGE_KEY_EDIT_SUGGESTIONS = 'foodie_jewdie_edit_suggestions_v1';

const INITIAL_LOCATION_SUGGESTIONS: LocationSuggestion[] = [
  {
    id: 'sug-101',
    createdAt: Date.now() - 3600000 * 5,
    name: 'Safed Mountain Bakery & Cafe',
    locationName: 'Old City, Safed (Zfat)',
    lat: 32.9654,
    lng: 35.4952,
    cost: '₪₪',
    hechsher: 'Badatz Mehadrin Zfat',
    description: 'Artisanal sourdoughs, rugelach, fresh shakshuka, and specialty coffee in an ancient stone courtyard in Safed.',
    phone: '04-6920111',
    openingHours: 'Sun–Thu 07:30 – 19:00, Fri 07:30 – 14:00',
    status: 'pending',
  },
];

const INITIAL_EDIT_SUGGESTIONS: EditSuggestion[] = [
  {
    id: 'edit-sug-201',
    createdAt: Date.now() - 3600000 * 2,
    locationId: 'loc-1',
    locationName: 'Pita Druze & Labneh',
    isClosed: 'No - Still Open & Operating',
    suggestedEdits: 'They updated their Friday opening hours to close at 16:00 for Shabbat. Kosher supervision is Rabbanut North.',
    status: 'pending',
  },
];

export default function App() {
  // 1. Locations State (Loaded from localStorage or initial seed)
  const [locations, setLocations] = useState<FoodLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOCATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved locations:', e);
    }
    return INITIAL_LOCATIONS;
  });

  // Save to localStorage when locations change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
    } catch (e) {
      console.warn('Failed to save locations to storage:', e);
    }
  }, [locations]);

  // 2. Admin Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    } catch {
      return false;
    }
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FoodLocation | null>(null);
  const [adminClickMode, setAdminClickMode] = useState(false);
  const [adminSelectedCoords, setAdminSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestedAddress, setSuggestedAddress] = useState<string | null>(null);
  const [isPickingOrigin, setIsPickingOrigin] = useState(false);

  // 3. User Origin State (Default: null - automatically attempts GPS detection on startup)
  const [userOrigin, setUserOrigin] = useState<UserOrigin | null>(null);
  const [isAutoLocatingGps, setIsAutoLocatingGps] = useState(false);

  // Automatically request GPS location on initial load without defaulting to any city
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsAutoLocatingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsAutoLocatingGps(false);
          setUserOrigin({
            name: 'Your GPS Location',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isGps: true,
          });
        },
        (err) => {
          setIsAutoLocatingGps(false);
          console.info('Auto-GPS not granted or unavailable:', err.message);
          // Do not default to Rosh Pina; keep origin as null
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  // 4. Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [maxDrivingMinutes, setMaxDrivingMinutes] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<FoodLocation | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Calculate distances and driving times for all locations based on current userOrigin
  const locationsWithTravelMetrics = useMemo(() => {
    return locations.map((loc) => {
      if (!userOrigin) {
        return { ...loc, distanceKm: undefined, drivingMinutes: undefined };
      }
      const dist = calculateHaversineDistanceKm(userOrigin.lat, userOrigin.lng, loc.lat, loc.lng);
      const time = estimateDrivingTimeMinutes(dist);
      return {
        ...loc,
        distanceKm: dist,
        drivingMinutes: time,
      };
    });
  }, [locations, userOrigin]);

  // Filtered locations (strictly Name, Location distance radius, and Driving time)
  const filteredLocations = useMemo(() => {
    return locationsWithTravelMetrics.filter((loc) => {
      // 1. Search by Name
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = loc.name.toLowerCase().includes(query);
        const matchesLocation = loc.locationName.toLowerCase().includes(query);
        if (!matchesName && !matchesLocation) {
          return false;
        }
      }

      // 2. Distance Radius filter (5km to 50km)
      if (maxDistanceKm !== null && loc.distanceKm !== undefined) {
        if (loc.distanceKm > maxDistanceKm) {
          return false;
        }
      }

      // 3. Driving Time filter (e.g. <= 15m, 30m, 45m, 60m)
      if (maxDrivingMinutes !== null && loc.drivingMinutes !== undefined) {
        if (loc.drivingMinutes > maxDrivingMinutes) {
          return false;
        }
      }

      return true;
    });
  }, [locationsWithTravelMetrics, searchQuery, maxDistanceKm, maxDrivingMinutes]);

  // Admin Auth Handlers
  const handleAdminLogin = (u: string, p: string) => {
    if ((u === 'Admin' || u.toLowerCase() === 'admin') && p === 'Hammers') {
      setIsAdminLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      } catch {}
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {}
    setToastMessage('Logged out from admin mode.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Location Handler
  const handleAddLocation = (
    data: Omit<FoodLocation, 'id' | 'createdAt' | 'addedByAdmin'>
  ) => {
    const newLoc: FoodLocation = {
      ...data,
      id: `loc-${Date.now()}`,
      createdAt: Date.now(),
      addedByAdmin: true,
    };

    setLocations((prev) => [newLoc, ...prev]);
    setSelectedLocation(newLoc);
    setAdminClickMode(false);
    setAdminSelectedCoords(null);

    // Scroll to map and notify
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    setToastMessage(`"${newLoc.name}" has been added and mapped!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Update Location Handler (admin only)
  const handleUpdateLocation = (updatedLoc: FoodLocation) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === updatedLoc.id ? updatedLoc : loc))
    );
    if (selectedLocation?.id === updatedLoc.id) {
      setSelectedLocation(updatedLoc);
    }
    setToastMessage(`"${updatedLoc.name}" updated successfully!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2b. Location Suggestions State (User Submitted -> Admin Inbox)
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse suggestions:', e);
    }
    return INITIAL_LOCATION_SUGGESTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(locationSuggestions));
    } catch {}
  }, [locationSuggestions]);

  // 2c. Edit Suggestions State (User Submitted Edits -> Admin Inbox)
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EDIT_SUGGESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse edit suggestions:', e);
    }
    return INITIAL_EDIT_SUGGESTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EDIT_SUGGESTIONS, JSON.stringify(editSuggestions));
    } catch {}
  }, [editSuggestions]);

  const [isPublicAddModalOpen, setIsPublicAddModalOpen] = useState(false);
  const [suggestEditLocation, setSuggestEditLocation] = useState<FoodLocation | null>(null);

  const pendingInboxCount = useMemo(() => {
    return (
      locationSuggestions.filter((s) => s.status === 'pending').length +
      editSuggestions.filter((s) => s.status === 'pending').length
    );
  }, [locationSuggestions, editSuggestions]);

  // Submit new place suggestion from public modal -> Admin Inbox
  const handleSubmitLocationSuggestion = (
    data: Omit<LocationSuggestion, 'id' | 'createdAt' | 'status'>
  ) => {
    const newSug: LocationSuggestion = {
      ...data,
      id: `sug-${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
    };
    setLocationSuggestions((prev) => [newSug, ...prev]);
    setToastMessage(`Suggestion for "${newSug.name}" sent to Admin Inbox!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit edit suggestion from place card -> Admin Inbox
  const handleSubmitEditSuggestion = (
    data: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>
  ) => {
    const newEditSug: EditSuggestion = {
      ...data,
      id: `edit-sug-${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
    };
    setEditSuggestions((prev) => [newEditSug, ...prev]);
    setToastMessage(`Suggested edit for "${data.locationName}" sent to Admin Inbox!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Admin approves a place suggestion directly from Inbox -> published to map
  const handleApproveLocationSuggestion = (sug: LocationSuggestion) => {
    const newLoc: FoodLocation = {
      id: `loc-${Date.now()}`,
      createdAt: Date.now(),
      addedByAdmin: true,
      name: sug.name,
      locationName: sug.locationName,
      lat: sug.lat,
      lng: sug.lng,
      cost: sug.cost,
      hechsher: sug.hechsher,
      recommendationType: sug.recommendationType || 'user',
      description: sug.description,
      websiteUrl: sug.websiteUrl,
      phone: sug.phone,
      openingHours: sug.openingHours,
    };

    setLocations((prev) => [newLoc, ...prev]);
    setLocationSuggestions((prev) =>
      prev.map((s) => (s.id === sug.id ? { ...s, status: 'approved' } : s))
    );
    setSelectedLocation(newLoc);
    setToastMessage(`"${sug.name}" approved and published to the map!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Admin rejects a place suggestion
  const handleRejectLocationSuggestion = (id: string) => {
    setLocationSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'rejected' } : s))
    );
    setToastMessage('Place suggestion removed from inbox.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Admin dismisses an edit suggestion
  const handleDismissEditSuggestion = (id: string) => {
    setEditSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'dismissed' } : s))
    );
    setToastMessage('Edit suggestion dismissed.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete Location Handler (admin only)
  const handleDeleteLocation = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    if (selectedLocation?.id === id) {
      setSelectedLocation(null);
    }
    setToastMessage('Location removed.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Trigger Map Coordinate Pick from Admin Form or Public Form
  const handleTriggerMapPick = () => {
    setAdminClickMode(true);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // When admin or user clicks on map to set coordinates for a place
  const handleAdminCoordsSelected = async (lat: number, lng: number) => {
    setAdminSelectedCoords({ lat, lng });
    setAdminClickMode(false);
    setIsAdminModalOpen(true);
    setToastMessage(`Pinned coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setTimeout(() => setToastMessage(null), 3500);

    const resolved = await reverseGeocodeCoords(lat, lng);
    if (resolved) {
      setSuggestedAddress(resolved);
    } else {
      setSuggestedAddress(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleCancelAdminPick = () => {
    setAdminClickMode(false);
    setIsAdminModalOpen(true);
  };

  // When user clicks map to set starting origin
  const handleOriginCoordsSelected = (lat: number, lng: number) => {
    setUserOrigin({
      name: `Map Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      lat,
      lng,
      isGps: false,
    });
    setIsPickingOrigin(false);
    setToastMessage(`Starting location set to (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCancelOriginPick = () => {
    setIsPickingOrigin(false);
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2C2724]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#2C2724] text-white px-4 py-3 rounded-xl shadow-xl border border-[#E5DECE]/30 flex items-center gap-2.5 text-xs md:text-sm animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#C86446]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenPublicAddModal={() => setIsPublicAddModalOpen(true)}
        onLogout={handleAdminLogout}
        onScrollToSection={handleScrollToSection}
        pendingInboxCount={pendingInboxCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-6">
        {/* Interactive Map Section */}
        <section id="map-section" ref={mapSectionRef} className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#C86446]" />
              <h2 className="font-display font-bold text-lg md:text-xl text-[#2C2724]">
                Interactive Map
              </h2>
            </div>
            <span className="text-xs text-[#7B7268]">
              Tap any pin for venue details & directions
            </span>
          </div>

          <NorthernMap
            locations={filteredLocations}
            selectedLocation={selectedLocation}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
            userOrigin={userOrigin}
            radiusKm={maxDistanceKm}
            adminClickMode={adminClickMode}
            onAdminCoordsSelected={handleAdminCoordsSelected}
            onCancelAdminPick={handleCancelAdminPick}
            adminSelectedCoords={adminSelectedCoords}
            originPickMode={isPickingOrigin}
            onOriginCoordsSelected={handleOriginCoordsSelected}
            onCancelOriginPick={handleCancelOriginPick}
          />
        </section>

        {/* Travel Filter Bar */}
        <section id="filter-section">
          <TravelFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            maxDistanceKm={maxDistanceKm}
            onMaxDistanceChange={setMaxDistanceKm}
            maxDrivingMinutes={maxDrivingMinutes}
            onMaxDrivingMinutesChange={setMaxDrivingMinutes}
            userOrigin={userOrigin}
            onSetUserOrigin={setUserOrigin}
            onToggleMapPickOrigin={() => setIsPickingOrigin((prev) => !prev)}
            isMapPickingOrigin={isPickingOrigin}
            isAutoLocating={isAutoLocatingGps}
            totalCount={locations.length}
            filteredCount={filteredLocations.length}
          />
        </section>

        {/* Full List of Locations Beneath the Map */}
        <section id="directory-section" className="pt-2">
          <LocationList
            locations={filteredLocations}
            selectedLocation={selectedLocation}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
            userOrigin={userOrigin}
            isAdminLoggedIn={isAdminLoggedIn}
            onEditLocation={(loc) => {
              setEditingLocation(loc);
              setIsAdminModalOpen(true);
            }}
            onDeleteLocation={handleDeleteLocation}
            onSuggestEdit={(loc) => setSuggestEditLocation(loc)}
            onScrollToMap={() => {
              if (mapSectionRef.current) {
                mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </section>
      </main>

      {/* Admin Login & Add/Manage/Inbox Location Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setEditingLocation(null);
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        onAddLocation={handleAddLocation}
        onUpdateLocation={handleUpdateLocation}
        onTriggerMapPick={handleTriggerMapPick}
        pendingCoords={adminSelectedCoords}
        suggestedAddress={suggestedAddress}
        locations={locations}
        onDeleteLocation={handleDeleteLocation}
        editingLocation={editingLocation}
        onClearEditingLocation={() => setEditingLocation(null)}
        locationSuggestions={locationSuggestions}
        editSuggestions={editSuggestions}
        onApproveLocationSuggestion={handleApproveLocationSuggestion}
        onRejectLocationSuggestion={handleRejectLocationSuggestion}
        onDismissEditSuggestion={handleDismissEditSuggestion}
      />

      {/* Public "Add Location" Suggestion Modal */}
      <PublicAddLocationModal
        isOpen={isPublicAddModalOpen}
        onClose={() => setIsPublicAddModalOpen(false)}
        onSubmitSuggestion={handleSubmitLocationSuggestion}
        onTriggerMapPick={handleTriggerMapPick}
        pendingCoords={adminSelectedCoords}
        suggestedAddress={suggestedAddress}
      />

      {/* Public "Suggest an Edit" Modal */}
      <SuggestEditModal
        location={suggestEditLocation}
        isOpen={Boolean(suggestEditLocation)}
        onClose={() => setSuggestEditLocation(null)}
        onSubmitEditSuggestion={handleSubmitEditSuggestion}
      />
    </div>
  );
}
