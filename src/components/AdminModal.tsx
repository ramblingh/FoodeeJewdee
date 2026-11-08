import React, { useState } from 'react';
import { FoodLocation, LocationSuggestion, EditSuggestion } from '../types';
import {
  X,
  Lock,
  PlusCircle,
  MapPin,
  Check,
  AlertCircle,
  Compass,
  Globe,
  Phone,
  Clock,
  Trash2,
  List,
  Pencil,
  Inbox,
  MessageSquare,
  CheckCircle2,
  ThumbsDown,
  Star,
  User as UserIcon,
  Database,
  ArrowRight,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminLoggedIn: boolean;
  adminUser?: User | null;
  onLogin: (username: string, pass: string) => Promise<boolean>;
  onLogout: () => void;
  onAddLocation: (locationData: Omit<FoodLocation, 'id' | 'createdAt' | 'addedByAdmin'>) => Promise<void> | void;
  onUpdateLocation?: (locationData: FoodLocation) => Promise<void> | void;
  onTriggerMapPick: () => void;
  pendingCoords: { lat: number; lng: number } | null;
  suggestedAddress?: string | null;
  locations?: FoodLocation[];
  onDeleteLocation?: (id: string) => Promise<void> | void;
  editingLocation?: FoodLocation | null;
  onClearEditingLocation?: () => void;
  locationSuggestions?: LocationSuggestion[];
  editSuggestions?: EditSuggestion[];
  onApproveLocationSuggestion?: (suggestion: LocationSuggestion) => Promise<void> | void;
  onRejectLocationSuggestion?: (id: string) => Promise<void> | void;
  onDismissEditSuggestion?: (id: string) => Promise<void> | void;
  onMigrateLocalData?: () => Promise<{ added: number; skipped: number }>;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdminLoggedIn,
  onLogin,
  onLogout,
  onAddLocation,
  onUpdateLocation,
  onTriggerMapPick,
  pendingCoords,
  suggestedAddress,
  locations = [],
  onDeleteLocation,
  editingLocation,
  onClearEditingLocation,
  locationSuggestions = [],
  editSuggestions = [],
  onApproveLocationSuggestion,
  onRejectLocationSuggestion,
  onDismissEditSuggestion,
  onMigrateLocalData,
}) => {
  // Tabs: 'add' | 'manage' | 'inbox' | 'migrate'
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'inbox' | 'migrate'>('add');
  const [inboxSubTab, setInboxSubTab] = useState<'newPlaces' | 'edits'>('newPlaces');
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);

  // Currently editing location ID (null when creating a new location)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Login form state (Username & Password)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginErrorDetails, setLoginErrorDetails] = useState<{
    code?: string;
    message: string;
    isAuthSuccessAdminFailed?: boolean;
  } | null>(null);

  // Add/Edit location form state
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number>(pendingCoords ? pendingCoords.lat : 32.95);
  const [lng, setLng] = useState<number>(pendingCoords ? pendingCoords.lng : 35.35);
  const [cost, setCost] = useState<'₪' | '₪₪' | '₪₪₪' | undefined>(undefined);
  const [hechsher, setHechsher] = useState('');
  const [recommendationType, setRecommendationType] = useState<'official' | 'user'>('official');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Migration status state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ added: number; skipped: number } | null>(null);

  // Sync if pending coords changed from map click
  React.useEffect(() => {
    if (pendingCoords) {
      const roundedLat = Number(pendingCoords.lat.toFixed(5));
      const roundedLng = Number(pendingCoords.lng.toFixed(5));
      setLat(roundedLat);
      setLng(roundedLng);
      if (suggestedAddress) {
        setLocationName(suggestedAddress);
      } else if (!locationName.trim() || locationName.startsWith('Coordinates:')) {
        setLocationName(`Coordinates: ${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)}`);
      }
    }
  }, [pendingCoords, suggestedAddress]);

  const handleStartEdit = (loc: FoodLocation) => {
    setEditingLocationId(loc.id);
    setName(loc.name);
    setLocationName(loc.locationName);
    setLat(loc.lat);
    setLng(loc.lng);
    setCost(loc.cost);
    setHechsher(loc.hechsher || '');
    setRecommendationType(loc.recommendationType || 'official');
    setDescription(loc.description || '');
    setWebsiteUrl(loc.websiteUrl || '');
    setPhone(loc.phone || '');
    setOpeningHours(loc.openingHours || '');
    setActiveTab('add');
  };

  const handleStartEditFromSuggestion = (sug: LocationSuggestion) => {
    setEditingSuggestionId(sug.id);
    setEditingLocationId(null);
    setName(sug.name);
    setLocationName(sug.locationName);
    setLat(sug.lat);
    setLng(sug.lng);
    setCost(sug.cost);
    setHechsher(sug.hechsher || '');
    setRecommendationType(sug.recommendationType || 'user');
    setDescription(sug.description || '');
    setWebsiteUrl(sug.websiteUrl || '');
    setPhone(sug.phone || '');
    setOpeningHours(sug.openingHours || '');
    setActiveTab('add');
  };

  React.useEffect(() => {
    if (editingLocation) {
      handleStartEdit(editingLocation);
    }
  }, [editingLocation]);

  const handleCancelEdit = () => {
    setEditingLocationId(null);
    setEditingSuggestionId(null);
    setName('');
    setLocationName('');
    setCost(undefined);
    setHechsher('');
    setRecommendationType('official');
    setDescription('');
    setWebsiteUrl('');
    setPhone('');
    setOpeningHours('');
    if (onClearEditingLocation) onClearEditingLocation();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorDetails(null);
    setIsSubmittingLogin(true);

    try {
      const success = await onLogin(username.trim(), password.trim());
      if (!success) {
        setLoginErrorDetails({
          code: 'invalid-credentials',
          message: 'Invalid credentials. Username must be "admin".',
        });
      } else {
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      const code = err.code || 'login-failed';
      const message = err.message || 'Authentication failed.';
      const isAuthSuccessAdminFailed =
        code === 'admin-document-not-found' ||
        code === 'permission-denied' ||
        code === 'invalid-admin-role' ||
        message.includes('Firebase Auth succeeded');

      setLoginErrorDetails({
        code,
        message,
        isAuthSuccessAdminFailed,
      });
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!locationName.trim() && (isNaN(lat) || isNaN(lng))) {
      setFormError('Address/Location on the map is required.');
      return;
    }

    setIsSubmittingForm(true);

    try {
      if (editingLocationId && onUpdateLocation) {
        const existing = locations.find((l) => l.id === editingLocationId);
        await onUpdateLocation({
          id: editingLocationId,
          createdAt: existing?.createdAt || Date.now(),
          addedByAdmin: true,
          name: name.trim(),
          locationName: locationName.trim() || `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat: isNaN(lat) ? 32.95 : lat,
          lng: isNaN(lng) ? 35.35 : lng,
          cost: cost || undefined,
          hechsher: hechsher.trim() || undefined,
          recommendationType,
          description: description.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          phone: phone.trim() || undefined,
          openingHours: openingHours.trim() || undefined,
        });

        setFormSuccess(true);
        setTimeout(() => {
          setFormSuccess(false);
          handleCancelEdit();
          setActiveTab('manage');
        }, 1100);
        return;
      }

      await onAddLocation({
        name: name.trim(),
        locationName: locationName.trim() || `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat: isNaN(lat) ? 32.95 : lat,
        lng: isNaN(lng) ? 35.35 : lng,
        cost: cost || undefined,
        hechsher: hechsher.trim() || undefined,
        recommendationType,
        description: description.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
      });

      if (editingSuggestionId && onRejectLocationSuggestion) {
        await onRejectLocationSuggestion(editingSuggestionId);
      }

      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        onClose();
        handleCancelEdit();
      }, 1100);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save location to Firestore.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleRunMigration = async () => {
    if (!onMigrateLocalData) return;
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await onMigrateLocalData();
      setMigrationResult(res);
    } catch (err: any) {
      alert(`Migration error: ${err.message || String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
      }`}
    >
      <div className="bg-white rounded-2xl border border-[#E5DECE] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-6 py-4 border-b border-[#E5DECE] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C86446]/10 text-[#C86446] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#2C2724]">
                {isAdminLoggedIn ? 'Administrator Portal' : 'Admin Login'}
              </h2>
              <p className="text-xs text-[#7B7268]">
                {isAdminLoggedIn
                  ? 'Signed in as Administrator (Firestore Verified)'
                  : 'Enter administrator credentials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7B7268] hover:text-[#2C2724] rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isAdminLoggedIn ? (
            /* Username / Password Login Form */
            <form onSubmit={handleLoginSubmit} className="max-w-md mx-auto space-y-4 py-4">
              <div className="text-center space-y-1 mb-6">
                <p className="text-sm text-[#524B43]">
                  Enter administrator credentials to manage food locations.
                </p>
              </div>

              {loginErrorDetails && (
                <div
                  className={`p-4 rounded-xl text-xs space-y-2 border ${
                    loginErrorDetails.isAuthSuccessAdminFailed
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>
                      {loginErrorDetails.isAuthSuccessAdminFailed
                        ? 'Authentication Succeeded, but Admin Authorization Failed'
                        : 'Login Failed'}
                    </span>
                  </div>

                  {loginErrorDetails.code && (
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span className="font-semibold text-[#524B43]">Error Code:</span>
                      <span className="bg-black/10 px-2 py-0.5 rounded font-bold text-[#2C2724]">
                        {loginErrorDetails.code}
                      </span>
                    </div>
                  )}

                  <p className="text-xs leading-relaxed font-medium">{loginErrorDetails.message}</p>

                  {loginErrorDetails.isAuthSuccessAdminFailed && (
                    <div className="pt-2 border-t border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                      <p className="font-semibold">Diagnostic Troubleshooting Checklist:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        <li>Ensure user <code className="bg-amber-100 px-1 rounded font-mono">admin@foodeejewdee.co.uk</code> exists in Firebase Auth.</li>
                        <li>Ensure document exists at path: <code className="bg-amber-100 px-1 rounded font-mono">/admins/&lt;user-uid&gt;</code> in Firestore.</li>
                        <li>Ensure document contains string field: <code className="bg-amber-100 px-1 rounded font-mono">role: "admin"</code> (lowercase).</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full py-2.5 px-4 bg-[#C86446] hover:bg-[#A84F35] text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingLogin ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Log In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Admin Logged-In Panel */
            <div className="space-y-5">
              {/* Top Bar with Tabs and Logout */}
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingLocationId) {
                        handleCancelEdit();
                      }
                      setActiveTab('add');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'add' && !editingLocationId
                        ? 'bg-[#C86446] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#524B43] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add New Place</span>
                  </button>

                  {editingLocationId && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        activeTab === 'add'
                          ? 'bg-[#C86446] text-white shadow-xs'
                          : 'bg-[#FAF7F2] text-[#524B43] hover:bg-[#EFECE6]'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Place</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleCancelEdit();
                      setActiveTab('manage');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'manage'
                        ? 'bg-[#C86446] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#524B43] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Manage ({locations.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCancelEdit();
                      setActiveTab('inbox');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'inbox'
                        ? 'bg-[#C86446] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#524B43] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>Inbox</span>
                    {(locationSuggestions.filter((s) => s.status === 'pending').length +
                      editSuggestions.filter((s) => s.status === 'pending').length) > 0 && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                          activeTab === 'inbox' ? 'bg-white text-[#C86446]' : 'bg-[#C86446] text-white'
                        }`}
                      >
                        {locationSuggestions.filter((s) => s.status === 'pending').length +
                          editSuggestions.filter((s) => s.status === 'pending').length}
                      </span>
                    )}
                  </button>

                  {onMigrateLocalData && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('migrate')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        activeTab === 'migrate'
                          ? 'bg-[#C86446] text-white shadow-xs'
                          : 'bg-[#FAF7F2] text-[#524B43] hover:bg-[#EFECE6]'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Migration</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Log Out
                </button>
              </div>

              {/* TAB 1: ADD OR EDIT LOCATION FORM */}
              {activeTab === 'add' && (
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {editingLocationId && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-[#C86446]" />
                        <span>Editing location: <strong>{name || 'Place'}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 text-xs bg-white text-[#524B43] border border-amber-300 rounded-md hover:bg-stone-50 font-semibold"
                      >
                        Cancel Edit
                      </button>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs md:text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {editingLocationId
                          ? 'Changes saved to Cloud Firestore! The map and directory have updated.'
                          : 'Place saved to Cloud Firestore! The map and directory have updated.'}
                      </span>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Recommendation Type Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2724] mb-1.5">
                      Recommendation Type <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRecommendationType('official')}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                          recommendationType === 'official'
                            ? 'bg-[#C86446]/10 border-[#C86446] ring-1 ring-[#C86446] text-[#2C2724]'
                            : 'bg-[#FAF7F2] border-[#E5DECE] text-[#7B7268] hover:bg-[#EFECE6]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${recommendationType === 'official' ? 'bg-[#C86446] text-white' : 'bg-stone-200 text-[#7B7268]'}`}>
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2C2724]">Official Recommendation</p>
                          <p className="text-[11px] text-[#7B7268]">Curated spot by Foodie Jewdie</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRecommendationType('user')}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                          recommendationType === 'user'
                            ? 'bg-[#5C6B47]/10 border-[#5C6B47] ring-1 ring-[#5C6B47] text-[#2C2724]'
                            : 'bg-[#FAF7F2] border-[#E5DECE] text-[#7B7268] hover:bg-[#EFECE6]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${recommendationType === 'user' ? 'bg-[#5C6B47] text-white' : 'bg-stone-200 text-[#7B7268]'}`}>
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2C2724]">User Recommendation</p>
                          <p className="text-[11px] text-[#7B7268]">Submitted by community users</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 1. Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                      Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Galilee Olive Mill & Bakery"
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                    />
                  </div>

                  {/* 2. Address / Location on Map */}
                  <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E5DECE] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#2C2724] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#C86446]" />
                        <span>Address / Location on Map</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          onTriggerMapPick();
                          onClose();
                        }}
                        className="text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{pendingCoords ? 'Repick on Map' : 'Pick on Map'}</span>
                      </button>
                    </div>

                    {pendingCoords && (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Pinned from Map: <strong>{lat.toFixed(4)}, {lng.toFixed(4)}</strong></span>
                      </div>
                    )}

                    <input
                      type="text"
                      required
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Village, town, street address, or landmark"
                      className="w-full px-3 py-2 bg-white border border-[#E5DECE] rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                    />

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#7B7268]">
                      <div>
                        <span>Latitude: </span>
                        <input
                          type="number"
                          step="0.0001"
                          value={lat}
                          onChange={(e) => setLat(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-[#E5DECE] rounded mt-0.5 tabular-nums text-xs"
                        />
                      </div>
                      <div>
                        <span>Longitude: </span>
                        <input
                          type="number"
                          step="0.0001"
                          value={lng}
                          onChange={(e) => setLng(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-[#E5DECE] rounded mt-0.5 tabular-nums text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Cost */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2724] mb-1.5">
                      Cost <span className="text-[#7B7268] font-normal">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setCost(undefined)}
                        className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                          cost === undefined
                            ? 'bg-[#2C2724] text-white border-[#2C2724]'
                            : 'bg-[#FAF7F2] text-[#7B7268] border-[#E5DECE]'
                        }`}
                      >
                        None
                      </button>
                      {(['₪', '₪₪', '₪₪₪'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setCost(lvl)}
                          className={`py-2 text-sm font-bold rounded-xl border transition-colors ${
                            cost === lvl
                              ? 'bg-[#C86446] text-white border-[#C86446] shadow-xs'
                              : 'bg-[#FAF7F2] text-[#2C2724] border-[#E5DECE] hover:bg-[#EFECE6]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Hechsher */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                      Hechsher (Kosher Certification) <span className="text-[#7B7268] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={hechsher}
                      onChange={(e) => setHechsher(e.target.value)}
                      placeholder="e.g. Rabbanut, Badatz Mehadrin, Tzohar, Bet Yosef..."
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                    />
                  </div>

                  {/* 5. Description */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                      Description <span className="text-[#7B7268] font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Information about the food, atmosphere, specialties, or seating..."
                      className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                    />
                  </div>

                  {/* 6. Website / Social */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                      Social Media Link or Website <span className="text-[#7B7268] font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B7268]" />
                      <input
                        type="text"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://instagram.com/... or https://..."
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                      />
                    </div>
                  </div>

                  {/* 7 & 8. Phone & Hours */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                        Phone Number <span className="text-[#7B7268] font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7B7268]" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+972 4-..."
                          className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                        Opening Hours <span className="text-[#7B7268] font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7B7268]" />
                        <input
                          type="text"
                          value={openingHours}
                          onChange={(e) => setOpeningHours(e.target.value)}
                          placeholder="Sun–Sat: 10:00 – 21:00"
                          className="w-full px-9 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="pt-3 border-t border-[#F0EBE1] flex items-center justify-end gap-3">
                    {editingLocationId ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-xs font-semibold text-[#524B43] hover:text-[#2C2724]"
                        >
                          Cancel Edit
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingForm}
                          className="py-2.5 px-6 bg-[#C86446] hover:bg-[#A84F35] text-white text-xs md:text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSubmittingForm ? 'Saving to Firestore...' : 'Save Changes'}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 text-xs font-semibold text-[#524B43] hover:text-[#2C2724]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingForm}
                          className="py-2.5 px-6 bg-[#C86446] hover:bg-[#A84F35] text-white text-xs md:text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>{isSubmittingForm ? 'Saving to Firestore...' : 'Add Location'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}

              {/* TAB 2: MANAGE LOCATIONS */}
              {activeTab === 'manage' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#7B7268]">
                    Click <strong>Edit</strong> to modify details (stored in Cloud Firestore), or <strong>Delete</strong> to remove.
                  </p>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {locations.map((loc) => {
                      const isConfirming = confirmDeleteId === loc.id;
                      const isUserRec = loc.recommendationType === 'user';
                      return (
                        <div
                          key={loc.id}
                          className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E5DECE] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <span
                              className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 ${
                                isUserRec
                                  ? 'bg-[#5C6B47]/10 text-[#5C6B47] border border-[#5C6B47]/20'
                                  : 'bg-[#C86446]/10 text-[#C86446] border border-[#C86446]/20'
                              }`}
                            >
                              {isUserRec ? <UserIcon className="w-3 h-3" /> : <Star className="w-3 h-3 fill-current" />}
                              {isUserRec ? 'User' : 'Official'}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs md:text-sm text-[#2C2724] truncate">
                                {loc.name}
                              </h4>
                              <p className="text-[11px] text-[#7B7268] truncate">
                                {loc.locationName} {loc.cost ? `· ${loc.cost}` : ''} {loc.hechsher ? `· Kosher: ${loc.hechsher}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(loc)}
                              className="px-2.5 py-1.5 text-xs text-[#2C2724] bg-white hover:bg-stone-100 border border-[#E5DECE] rounded-lg flex items-center gap-1 transition-colors font-medium shadow-xs"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#C86446]" />
                              <span>Edit</span>
                            </button>

                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (onDeleteLocation) {
                                      await onDeleteLocation(loc.id);
                                    }
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs text-[#524B43] hover:bg-white border border-[#E5DECE] rounded-lg"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(loc.id)}
                                className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: ADMIN INBOX */}
              {activeTab === 'inbox' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#F0EBE1] pb-2">
                    <button
                      type="button"
                      onClick={() => setInboxSubTab('newPlaces')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        inboxSubTab === 'newPlaces'
                          ? 'bg-[#2C2724] text-white'
                          : 'bg-[#FAF7F2] text-[#7B7268] hover:bg-[#EFECE6]'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>New Place Suggestions</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-mono">
                        {locationSuggestions.filter((s) => s.status === 'pending').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInboxSubTab('edits')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        inboxSubTab === 'edits'
                          ? 'bg-[#2C2724] text-white'
                          : 'bg-[#FAF7F2] text-[#7B7268] hover:bg-[#EFECE6]'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Suggested Edits</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-mono">
                        {editSuggestions.filter((s) => s.status === 'pending').length}
                      </span>
                    </button>
                  </div>

                  {inboxSubTab === 'newPlaces' && (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {locationSuggestions.filter((s) => s.status === 'pending').length === 0 ? (
                        <div className="py-12 text-center bg-[#FAF7F2] rounded-xl border border-[#E5DECE] p-6 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <h4 className="font-semibold text-sm text-[#2C2724]">All Caught Up!</h4>
                          <p className="text-xs text-[#7B7268]">
                            No pending place suggestions in Firestore inbox.
                          </p>
                        </div>
                      ) : (
                        locationSuggestions
                          .filter((s) => s.status === 'pending')
                          .map((sug) => {
                            const isUserRec = sug.recommendationType !== 'official';
                            return (
                              <div
                                key={sug.id}
                                className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E5DECE] space-y-3 shadow-xs"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                                          isUserRec
                                            ? 'bg-[#5C6B47]/10 text-[#5C6B47] border border-[#5C6B47]/20'
                                            : 'bg-[#C86446]/10 text-[#C86446] border border-[#C86446]/20'
                                        }`}
                                      >
                                        {isUserRec ? <UserIcon className="w-3 h-3" /> : <Star className="w-3 h-3 fill-current" />}
                                        {isUserRec ? 'User Rec' : 'Official Rec'}
                                      </span>
                                      <h4 className="font-bold text-sm text-[#2C2724]">
                                        {sug.name}
                                      </h4>
                                      {sug.cost && (
                                        <span className="text-[11px] font-bold text-[#C86446] bg-[#C86446]/10 px-2 py-0.5 rounded font-mono">
                                          {sug.cost}
                                        </span>
                                      )}
                                      {sug.hechsher && (
                                        <span className="text-[11px] font-semibold text-[#5C6B47] bg-[#5C6B47]/10 px-2 py-0.5 rounded border border-[#5C6B47]/20">
                                          Kosher: {sug.hechsher}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#5C6B47] font-medium flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-[#C86446]" />
                                      <span>{sug.locationName}</span>
                                    </p>
                                    {sug.description && (
                                      <p className="text-xs text-[#524B43] line-clamp-2">
                                        {sug.description}
                                      </p>
                                    )}
                                  </div>

                                  <span className="text-[10px] text-[#7B7268] shrink-0 bg-white px-2 py-0.5 rounded border border-[#E5DECE]">
                                    {new Date(sug.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-[#E5DECE] flex items-center justify-end gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (onRejectLocationSuggestion) {
                                        await onRejectLocationSuggestion(sug.id);
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 font-medium"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStartEditFromSuggestion(sug)}
                                    className="px-3 py-1.5 text-xs text-[#2C2724] bg-[#FAF7F2] hover:bg-stone-100 border border-[#E5DECE] rounded-lg flex items-center gap-1.5 font-semibold shadow-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#C86446]" />
                                    <span>Edit First</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (onApproveLocationSuggestion) {
                                        await onApproveLocationSuggestion(sug);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Confirm & Publish</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}

                  {inboxSubTab === 'edits' && (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {editSuggestions.filter((s) => s.status === 'pending').length === 0 ? (
                        <div className="py-12 text-center bg-[#FAF7F2] rounded-xl border border-[#E5DECE] p-6 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <h4 className="font-semibold text-sm text-[#2C2724]">No Edit Suggestions</h4>
                          <p className="text-xs text-[#7B7268]">
                            No user reported edits pending in Firestore inbox.
                          </p>
                        </div>
                      ) : (
                        editSuggestions
                          .filter((s) => s.status === 'pending')
                          .map((edit) => (
                            <div
                              key={edit.id}
                              className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E5DECE] space-y-2.5 shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-sm text-[#2C2724]">
                                    {edit.locationName}
                                  </h4>
                                  <span className="text-[11px] text-[#7B7268]">
                                    Submitted {new Date(edit.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                                    edit.isClosed.toLowerCase().includes('yes')
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  Status: {edit.isClosed}
                                </span>
                              </div>

                              {edit.suggestedEdits ? (
                                <div className="p-3 bg-white rounded-lg border border-[#E5DECE] text-xs text-[#2C2724] space-y-1">
                                  <span className="font-semibold text-[#7B7268] text-[11px] block">
                                    Suggested Edits / Notes:
                                  </span>
                                  <p className="leading-relaxed whitespace-pre-wrap">
                                    {edit.suggestedEdits}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-[#7B7268] italic">
                                  No additional notes provided.
                                </p>
                              )}

                              <div className="pt-2 border-t border-[#E5DECE] flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (onDismissEditSuggestion) {
                                      await onDismissEditSuggestion(edit.id);
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs text-[#524B43] hover:bg-stone-100 border border-[#E5DECE] rounded-lg font-medium"
                                >
                                  Dismiss
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchingLoc = locations.find((l) => l.id === edit.locationId);
                                    if (matchingLoc) {
                                      handleStartEdit(matchingLoc);
                                    } else {
                                      setActiveTab('manage');
                                    }
                                  }}
                                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] rounded-lg shadow-xs flex items-center gap-1.5"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit Location</span>
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MIGRATION TAB */}
              {activeTab === 'migrate' && (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E5DECE] space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#C86446]/10 text-[#C86446] flex items-center justify-center shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#2C2724]">
                          Safe One-Time LocalStorage Migration
                        </h4>
                        <p className="text-xs text-[#7B7268]">
                          Migrate existing restaurant records from browser storage into Cloud Firestore.
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#524B43] leading-relaxed">
                      This safe process inspects items currently stored in your browser's local cache.
                      It checks Cloud Firestore and uploads any missing locations without overwriting or duplicating existing records.
                    </p>

                    {migrationResult && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Migration Complete!</span>
                        </p>
                        <p>
                          Added <strong>{migrationResult.added}</strong> new locations to Firestore.
                          Skipped <strong>{migrationResult.skipped}</strong> already existing duplicate records.
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleRunMigration}
                        disabled={isMigrating}
                        className="px-5 py-2.5 bg-[#C86446] hover:bg-[#A84F35] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>{isMigrating ? 'Migrating Data...' : 'Run One-Time Migration'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
