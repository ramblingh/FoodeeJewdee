import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FoodLocation, UserOrigin, LocationSuggestion, EditSuggestion } from './types';
import { INITIAL_LOCATIONS } from './data/initialLocations';
import { calculateHaversineDistanceKm, reverseGeocodeCoords } from './utils/geo';
import { Header } from './components/Header';
import { NorthernMap } from './components/NorthernMap';
import { TravelFilterBar } from './components/TravelFilterBar';
import { LocationList } from './components/LocationList';
import { AdminModal } from './components/AdminModal';
import { PublicAddLocationModal } from './components/PublicAddLocationModal';
import { SuggestEditModal } from './components/SuggestEditModal';
import { MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  subscribeToRestaurants,
  addRestaurantToFirestore,
  updateRestaurantInFirestore,
  deleteRestaurantFromFirestore,
  subscribeToSuggestions,
  submitPublicLocationSuggestion,
  submitPublicEditSuggestion,
  updateSuggestionStatusInFirestore,
  deleteSuggestionFromFirestore,
  migrateLocalDataToFirestore,
} from './services/restaurantService';
import {
  subscribeToAuthChanges,
  loginAdminWithUsername,
  logoutFirebase,
} from './services/authService';
import { testFirestoreConnection } from './services/firebase';

const STORAGE_KEY_LOCATIONS = 'northern_eats_locations_v1';

export default function App() {
  // 1. Locations State (Loaded in real-time from Cloud Firestore)
  const [locations, setLocations] = useState<FoodLocation[]>([]);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);

  // 2. Auth State
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // 3. Suggestions State (Real-time from Cloud Firestore for Admins)
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([]);

  // 4. Modal & UI State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FoodLocation | null>(null);
  const [adminClickMode, setAdminClickMode] = useState(false);
  const [adminSelectedCoords, setAdminSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestedAddress, setSuggestedAddress] = useState<string | null>(null);
  const [isPickingOrigin, setIsPickingOrigin] = useState(false);

  // 5. User Origin & GPS State
  const [userOrigin, setUserOrigin] = useState<UserOrigin | null>(null);
  const [isAutoLocatingGps, setIsAutoLocatingGps] = useState(false);

  // 6. Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<FoodLocation | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Connection Test & Auth Subscription on Mount
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribeAuth = subscribeToAuthChanges((user, isAdmin) => {
      setAdminUser(user);
      setIsAdminLoggedIn(isAdmin);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Real-time Firestore Restaurants Subscription
  useEffect(() => {
    setIsFirestoreLoading(true);
    const unsubscribeRestaurants = subscribeToRestaurants(
      (firestoreLocations) => {
        if (firestoreLocations.length === 0) {
          // Fallback to initial seed if database is brand new
          setLocations(INITIAL_LOCATIONS);
        } else {
          setLocations(firestoreLocations);
        }
        setIsFirestoreLoading(false);
      },
      () => {
        setIsFirestoreLoading(false);
      }
    );

    return () => {
      unsubscribeRestaurants();
    };
  }, []);

  // Real-time Firestore Suggestions Subscription for Admins
  useEffect(() => {
    const unsubscribeSuggestions = subscribeToSuggestions(
      isAdminLoggedIn,
      (places, edits) => {
        setLocationSuggestions(places);
        setEditSuggestions(edits);
      }
    );

    return () => {
      unsubscribeSuggestions();
    };
  }, [isAdminLoggedIn]);

  // Request GPS Location on initial load
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
          console.info('Auto-GPS unavailable:', err.message);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Calculate distance for all locations based on current userOrigin
  const locationsWithTravelMetrics = useMemo(() => {
    return locations.map((loc) => {
      if (!userOrigin) {
        return { ...loc, distanceKm: undefined };
      }
      const dist = calculateHaversineDistanceKm(userOrigin.lat, userOrigin.lng, loc.lat, loc.lng);
      return {
        ...loc,
        distanceKm: dist,
      };
    });
  }, [locations, userOrigin]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locationsWithTravelMetrics.filter((loc) => {
      if (searchQuery.trim()) {
        const queryStr = searchQuery.toLowerCase().trim();
        const matchesName = loc.name.toLowerCase().includes(queryStr);
        const matchesLocation = loc.locationName.toLowerCase().includes(queryStr);
        if (!matchesName && !matchesLocation) {
          return false;
        }
      }

      if (maxDistanceKm !== null && loc.distanceKm !== undefined) {
        if (loc.distanceKm > maxDistanceKm) {
          return false;
        }
      }

      return true;
    });
  }, [locationsWithTravelMetrics, searchQuery, maxDistanceKm]);

  // Firebase Admin Login (Username "admin" -> internal auth admin@foodiejewdie.com)
  const handleAdminLogin = async (usernameInput: string, p: string): Promise<boolean> => {
    try {
      const { isAdmin } = await loginAdminWithUsername(usernameInput, p);
      if (isAdmin) {
        setToastMessage('Signed in as Administrator!');
        setTimeout(() => setToastMessage(null), 3000);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const handleAdminLogout = async () => {
    await logoutFirebase();
    setIsAdminLoggedIn(false);
    setToastMessage('Signed out from admin mode.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Location to Cloud Firestore (Admin only)
  const handleAddLocation = async (
    data: Omit<FoodLocation, 'id' | 'createdAt' | 'addedByAdmin'>
  ) => {
    const newLoc = await addRestaurantToFirestore(data);
    setSelectedLocation(newLoc);
    setAdminClickMode(false);
    setAdminSelectedCoords(null);

    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    setToastMessage(`"${newLoc.name}" saved to Cloud Firestore!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Update Location in Cloud Firestore (Admin only)
  const handleUpdateLocation = async (updatedLoc: FoodLocation) => {
    await updateRestaurantInFirestore(updatedLoc);
    if (selectedLocation?.id === updatedLoc.id) {
      setSelectedLocation(updatedLoc);
    }
    setToastMessage(`"${updatedLoc.name}" updated in Firestore!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Delete Location from Cloud Firestore (Admin only)
  const handleDeleteLocation = async (id: string) => {
    await deleteRestaurantFromFirestore(id);
    if (selectedLocation?.id === id) {
      setSelectedLocation(null);
    }
    setToastMessage('Location removed from Firestore.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [isPublicAddModalOpen, setIsPublicAddModalOpen] = useState(false);
  const [suggestEditLocation, setSuggestEditLocation] = useState<FoodLocation | null>(null);

  const pendingInboxCount = useMemo(() => {
    return (
      locationSuggestions.filter((s) => s.status === 'pending').length +
      editSuggestions.filter((s) => s.status === 'pending').length
    );
  }, [locationSuggestions, editSuggestions]);

  // Submit new place suggestion to Cloud Firestore
  const handleSubmitLocationSuggestion = async (
    data: Omit<LocationSuggestion, 'id' | 'createdAt' | 'status'>
  ) => {
    await submitPublicLocationSuggestion(data);
    setToastMessage(`Suggestion for "${data.name}" sent to Admin Inbox!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit edit suggestion to Cloud Firestore
  const handleSubmitEditSuggestion = async (
    data: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>
  ) => {
    await submitPublicEditSuggestion(data);
    setToastMessage(`Suggested edit for "${data.locationName}" sent to Admin Inbox!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Admin approves a suggestion from Inbox -> publishes to Firestore
  const handleApproveLocationSuggestion = async (sug: LocationSuggestion) => {
    const newRestaurantData = {
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

    const newLoc = await addRestaurantToFirestore(newRestaurantData);
    await updateSuggestionStatusInFirestore(sug.id, 'approved');

    setSelectedLocation(newLoc);
    setToastMessage(`"${sug.name}" approved and published to Firestore!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Admin rejects a place suggestion in Firestore
  const handleRejectLocationSuggestion = async (id: string) => {
    await updateSuggestionStatusInFirestore(id, 'rejected');
    setToastMessage('Place suggestion marked rejected.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Admin dismisses an edit suggestion in Firestore
  const handleDismissEditSuggestion = async (id: string) => {
    await deleteSuggestionFromFirestore(id);
    setToastMessage('Edit suggestion dismissed.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // One-time safe data migration mechanism from localStorage to Cloud Firestore
  const handleMigrateLocalData = async () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOCATIONS);
      let localItems: FoodLocation[] = [];
      if (saved) {
        localItems = JSON.parse(saved);
      }
      if (!localItems || localItems.length === 0) {
        localItems = INITIAL_LOCATIONS;
      }
      return await migrateLocalDataToFirestore(localItems);
    } catch (err: any) {
      throw new Error(`Migration failed: ${err.message}`);
    }
  };

  const [mapPickSource, setMapPickSource] = useState<'admin' | 'public'>('public');

  // Trigger Map Coordinate Pick from Admin Form
  const handleTriggerMapPickFromAdmin = () => {
    setMapPickSource('admin');
    setAdminSelectedCoords(null);
    setSuggestedAddress(null);
    setAdminClickMode(true);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Trigger Map Coordinate Pick from Public Form
  const handleTriggerMapPickFromPublic = () => {
    setMapPickSource('public');
    setAdminSelectedCoords(null);
    setSuggestedAddress(null);
    setAdminClickMode(true);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // User taps somewhere on the map to pin a location
  const handleAdminCoordsSelected = async (lat: number, lng: number) => {
    setAdminSelectedCoords({ lat, lng });
    setToastMessage(`Pinned location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setTimeout(() => setToastMessage(null), 3500);

    const resolved = await reverseGeocodeCoords(lat, lng);
    if (resolved) {
      setSuggestedAddress(resolved);
    } else {
      setSuggestedAddress(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // User presses "Confirm & Return to Form" on the map confirmation card
  const handleConfirmPickedCoords = () => {
    setAdminClickMode(false);
    if (mapPickSource === 'public') {
      setIsPublicAddModalOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  // User presses "Tap Another Spot"
  const handleRepickCoords = () => {
    setAdminSelectedCoords(null);
    setSuggestedAddress(null);
  };

  // User cancels map picking
  const handleCancelAdminPick = () => {
    setAdminClickMode(false);
    if (mapPickSource === 'public') {
      setIsPublicAddModalOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

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
            suggestedAddress={suggestedAddress}
            onConfirmPickedCoords={handleConfirmPickedCoords}
            onRepickCoords={handleRepickCoords}
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

      {/* Admin Login & Management Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setEditingLocation(null);
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        adminUser={adminUser}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        onAddLocation={handleAddLocation}
        onUpdateLocation={handleUpdateLocation}
        onTriggerMapPick={handleTriggerMapPickFromAdmin}
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
        onMigrateLocalData={handleMigrateLocalData}
      />

      {/* Public "Add Location" Suggestion Modal */}
      <PublicAddLocationModal
        isOpen={isPublicAddModalOpen}
        onClose={() => setIsPublicAddModalOpen(false)}
        onSubmitSuggestion={handleSubmitLocationSuggestion}
        onTriggerMapPick={handleTriggerMapPickFromPublic}
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
