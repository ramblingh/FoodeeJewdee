import React, { useState } from 'react';
import { FoodLocation, EditSuggestion } from '../types';
import { X, Edit3, Check, AlertCircle, Send, Info } from 'lucide-react';

interface SuggestEditModalProps {
  location: FoodLocation | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitEditSuggestion: (data: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>) => void;
}

export const SuggestEditModal: React.FC<SuggestEditModalProps> = ({
  location,
  isOpen,
  onClose,
  onSubmitEditSuggestion,
}) => {
  const [isClosedStatus, setIsClosedStatus] = useState<string>('No - Still Open & Operating');
  const [customClosedNotes, setCustomClosedNotes] = useState('');
  const [suggestedEdits, setSuggestedEdits] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !location) return null;

  const resetForm = () => {
    setIsClosedStatus('No - Still Open & Operating');
    setCustomClosedNotes('');
    setSuggestedEdits('');
    setFormSuccess(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isClosedStatus && !suggestedEdits.trim()) {
      setFormError('Please select whether the venue is closed or type your suggested edits.');
      return;
    }

    const finalClosedVal =
      isClosedStatus === 'Other' && customClosedNotes.trim()
        ? `Other: ${customClosedNotes.trim()}`
        : isClosedStatus;

    onSubmitEditSuggestion({
      locationId: location.id,
      locationName: location.name,
      isClosed: finalClosedVal,
      suggestedEdits: suggestedEdits.trim(),
    });

    setFormSuccess(true);
    setTimeout(() => {
      resetForm();
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E5DECE] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-6 py-4 border-b border-[#E5DECE] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C86446]/10 text-[#C86446] flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#2C2724]">
                Suggest an Edit
              </h2>
              <p className="text-xs text-[#7B7268] truncate max-w-xs md:max-w-sm">
                For <strong>{location.name}</strong> ({location.locationName})
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {formSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#2C2724]">
                Suggestion Submitted!
              </h3>
              <p className="text-xs text-[#524B43] leading-relaxed max-w-xs mx-auto">
                Thank you for helping keep Foodie Jewdie accurate. The administrator will review your suggested edits shortly.
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

              {/* Field 1: Is this place closed? */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#2C2724]">
                  1. Is this place currently closed?
                </label>
                <div className="space-y-1.5">
                  {[
                    'No - Still Open & Operating',
                    'Yes - Permanently Closed',
                    'Yes - Temporarily Closed (Renovations / Seasonal)',
                    'Uncertain / Hours Have Changed',
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isClosedStatus === option
                          ? 'bg-[#C86446]/10 border-[#C86446] font-semibold text-[#2C2724]'
                          : 'bg-[#FAF7F2] border-[#E5DECE] text-[#524B43] hover:bg-[#EFECE6]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="closedStatus"
                        value={option}
                        checked={isClosedStatus === option}
                        onChange={(e) => setIsClosedStatus(e.target.value)}
                        className="accent-[#C86446]"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Field 2: Type any edits or corrections */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#2C2724]">
                  2. What edits or corrections should be made?
                </label>
                <textarea
                  rows={4}
                  value={suggestedEdits}
                  onChange={(e) => setSuggestedEdits(e.target.value)}
                  placeholder="e.g. The phone number changed to 04-..., new kosher certificate is Mehadrin, moved to building next door, updated opening hours..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DECE] rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30 focus:border-[#C86446]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#F0EBE1]">
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
                  className="py-2.5 px-5 bg-[#C86446] hover:bg-[#A84F35] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Suggestion</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
