import React, { useState, useEffect } from 'react';
import { LocationSuggestion } from '../types';
import {
  X,
  PlusCircle,
  MapPin,
  Check,
  AlertCircle,
  Compass,
  Globe,
  Phone,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PublicAddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuggestion: (data: Omit<LocationSuggestion, 'id' | 'createdAt' | 'status'>) => void;
  onTriggerMapPick: () => void;
  pendingCoords: { lat: number; lng: number } | null;
  suggestedAddress?: string | null;
}

export const PublicAddLocationModal: React.FC<PublicAddLocationModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuggestion,
  onTriggerMapPick,
  pendingCoords,
  suggestedAddress,
}) => {
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number>(pendingCoords ? pendingCoords.lat : 32.95);
  const [lng, setLng] = useState<number>(pendingCoords ? pendingCoords.lng : 35.35);
  const [cost, setCost] = useState<'₪' | '₪₪' | '₪₪₪' | undefined>(undefined);
  const [hechsher, setHechsher] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync pending coords if picked from map
  useEffect(() => {
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

  const resetForm = () => {
    setName('');
    setLocationName('');
    setCost(undefined);
    setHechsher('');
    setDescription('');
    setWebsiteUrl('');
    setPhone('');
    setOpeningHours('');
    setFormSuccess(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    onSubmitSuggestion({
      name: name.trim(),
      locationName: locationName.trim() || `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat: isNaN(lat) ? 32.95 : lat,
      lng: isNaN(lng) ? 35.35 : lng,
      cost: cost || undefined,
      hechsher: hechsher.trim() || undefined,
      recommendationType: 'user',
      description: description.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      phone: phone.trim() || undefined,
      openingHours: openingHours.trim() || undefined,
    });

    setFormSuccess(true);
    setTimeout(() => {
      resetForm();
      onClose();
    }, 1600);
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
            <div className="w-9 h-9 rounded-xl bg-[#C86446]/10 text-[#C86446] flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg md:text-xl text-[#2C2724]">
                Suggest a New Food Place
              </h2>
              <p className="text-xs text-[#7B7268]">
                Know a great restaurant, food truck, or bakery in Northern Israel? Share it below!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 text-[#7B7268] hover:text-[#2C2724] rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {formSuccess ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="font-display font-bold text-xl text-[#2C2724]">
                Thank You for Your Suggestion!
              </h3>
              <p className="text-sm text-[#524B43] max-w-md mx-auto leading-relaxed">
                Your submission for <strong>"{name}"</strong> has been sent to the Foodie Jewdie team inbox. We'll review and publish it to the map shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Notice Banner */}
              <div className="p-3 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs text-[#524B43] flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#C86446] shrink-0 mt-0.5" />
                <span>
                  Submissions go directly to our admin inbox for verification before appearing on the map.
                </span>
              </div>


              {/* 2. Place Name (Required) */}
              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                  Place Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Upper Galilee Smoked Meat & Grill"
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                />
              </div>

              {/* 3. Address / Location on Map (Required) */}
              <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E5DECE] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2C2724] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#C86446]" />
                    <span>Address / Location on the Map</span>
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

              {/* 4. Cost (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1.5">
                  Cost Level <span className="text-[#7B7268] font-normal">(Optional)</span>
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
                    Not sure
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

              {/* 5. Hechsher (Kosher Certification) - Optional */}
              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                  Hechsher / Kosher Certification <span className="text-[#7B7268] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={hechsher}
                  onChange={(e) => setHechsher(e.target.value)}
                  placeholder="e.g. Rabbanut, Badatz Mehadrin, Tzohar..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                />
              </div>

              {/* 6. Description - Optional */}
              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                  Description / Notes <span className="text-[#7B7268] font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about the atmosphere, special dishes, seating..."
                  className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                />
              </div>

              {/* 7. Social Media Link or Website - Optional */}
              <div>
                <label className="block text-xs font-semibold text-[#2C2724] mb-1">
                  Social Link or Website <span className="text-[#7B7268] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B7268]" />
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://instagram.com/... or website URL"
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                  />
                </div>
              </div>

              {/* 8 & 9. Phone & Opening Hours - Optional */}
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
                      placeholder="e.g. Sun–Thu 11:00 – 22:00"
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#F0EBE1] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#524B43] hover:text-[#2C2724]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-[#C86446] hover:bg-[#A84F35] text-white text-xs md:text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit Suggestion</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
