export interface FoodLocation {
  id: string;
  name: string;
  locationName: string; // Address / Location description
  address?: string;
  lat: number;
  lng: number;
  cost?: '₪' | '₪₪' | '₪₪₪'; // 1, 2, or 3 shekel symbols
  hechsher?: string; // Kosher certification / supervision (e.g. Rabbanut, Badatz, Mehadrin, Tzohar)
  recommendationType?: 'official' | 'user'; // "Official Recommendation" or "User Recommendation"
  description?: string;
  websiteUrl?: string; // Social media link or website
  phone?: string;
  openingHours?: string;
  imageUrl?: string;
  addedByAdmin: boolean;
  createdAt: number;
  // Computed fields at runtime based on origin:
  distanceKm?: number;
  drivingMinutes?: number;
}

export interface UserOrigin {
  name: string;
  lat: number;
  lng: number;
  isGps: boolean;
}

export interface LocationSuggestion {
  id: string;
  createdAt: number;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  cost?: '₪' | '₪₪' | '₪₪₪';
  hechsher?: string;
  recommendationType?: 'official' | 'user';
  description?: string;
  websiteUrl?: string;
  phone?: string;
  openingHours?: string;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface EditSuggestion {
  id: string;
  createdAt: number;
  locationId: string;
  locationName: string;
  isClosed: string; // e.g. "Yes - Permanently Closed", "Yes - Temporarily Closed", "No - It is Open", etc.
  suggestedEdits: string; // User typed feedback/corrections
  status: 'pending' | 'reviewed' | 'dismissed';
}
