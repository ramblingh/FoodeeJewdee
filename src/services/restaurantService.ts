import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { FoodLocation, LocationSuggestion, EditSuggestion } from '../types';

const RESTAURANTS_PATH = 'restaurants';
const SUGGESTIONS_PATH = 'suggestions';

/**
 * Clean restaurant object before writing to Firestore to strip undefined values
 */
function cleanRestaurantData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && key !== 'distanceKm' && key !== 'drivingMinutes') {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

/**
 * Real-time listener for approved restaurants (accessible by all visitors)
 */
export function subscribeToRestaurants(
  onData: (locations: FoodLocation[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, RESTAURANTS_PATH);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FoodLocation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || '',
          locationName: data.locationName || '',
          lat: data.lat ?? 32.95,
          lng: data.lng ?? 35.35,
          cost: data.cost,
          hechsher: data.hechsher,
          recommendationType: data.recommendationType || 'official',
          description: data.description,
          websiteUrl: data.websiteUrl,
          phone: data.phone,
          openingHours: data.openingHours,
          imageUrl: data.imageUrl,
          addedByAdmin: data.addedByAdmin ?? true,
          createdAt: data.createdAt || Date.now(),
        });
      });

      // Sort by creation time descending or name
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(items);
    },
    (error) => {
      console.warn('Restaurants listener error:', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, RESTAURANTS_PATH);
    }
  );
}

/**
 * Add a new restaurant directly (Admin only)
 */
export async function addRestaurantToFirestore(
  locationData: Omit<FoodLocation, 'id' | 'createdAt' | 'addedByAdmin'>
): Promise<FoodLocation> {
  const id = `loc-${Date.now()}`;
  const newRestaurant: FoodLocation = {
    ...locationData,
    id,
    createdAt: Date.now(),
    addedByAdmin: true,
  };

  const payload = cleanRestaurantData(newRestaurant);
  try {
    await setDoc(doc(db, RESTAURANTS_PATH, id), payload);
    return newRestaurant;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${RESTAURANTS_PATH}/${id}`);
    throw error;
  }
}

/**
 * Update an existing restaurant (Admin only)
 */
export async function updateRestaurantInFirestore(
  updatedLoc: FoodLocation
): Promise<void> {
  const payload = cleanRestaurantData(updatedLoc);
  try {
    await setDoc(doc(db, RESTAURANTS_PATH, updatedLoc.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESTAURANTS_PATH}/${updatedLoc.id}`);
    throw error;
  }
}

/**
 * Delete a restaurant (Admin only)
 */
export async function deleteRestaurantFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RESTAURANTS_PATH, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RESTAURANTS_PATH}/${id}`);
    throw error;
  }
}

/**
 * Real-time listener for public suggestions & edit requests (Admin only)
 */
export function subscribeToSuggestions(
  isAdmin: boolean,
  onData: (suggestions: LocationSuggestion[], edits: EditSuggestion[]) => void
) {
  if (!isAdmin) {
    onData([], []);
    return () => {};
  }

  const colRef = collection(db, SUGGESTIONS_PATH);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const placeSuggestions: LocationSuggestion[] = [];
      const editSuggestions: EditSuggestion[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.type === 'edit' || data.isClosed !== undefined) {
          editSuggestions.push({
            id: docSnap.id,
            createdAt: data.createdAt || Date.now(),
            locationId: data.locationId || '',
            locationName: data.locationName || '',
            isClosed: data.isClosed || 'No',
            suggestedEdits: data.suggestedEdits || data.description || '',
            status: data.status || 'pending',
          });
        } else {
          placeSuggestions.push({
            id: docSnap.id,
            createdAt: data.createdAt || Date.now(),
            name: data.name || '',
            locationName: data.locationName || '',
            lat: data.lat ?? 32.95,
            lng: data.lng ?? 35.35,
            cost: data.cost,
            hechsher: data.hechsher,
            recommendationType: data.recommendationType || 'user',
            description: data.description,
            websiteUrl: data.websiteUrl,
            phone: data.phone,
            openingHours: data.openingHours,
            imageUrl: data.imageUrl,
            status: data.status || 'pending',
          });
        }
      });

      placeSuggestions.sort((a, b) => b.createdAt - a.createdAt);
      editSuggestions.sort((a, b) => b.createdAt - a.createdAt);

      onData(placeSuggestions, editSuggestions);
    },
    (error) => {
      console.warn('Suggestions listener error (Non-admin or permissions error):', error.message);
      onData([], []);
    }
  );
}

/**
 * Public users submit new place suggestions to Firestore
 */
export async function submitPublicLocationSuggestion(
  suggestionData: Omit<LocationSuggestion, 'id' | 'createdAt' | 'status'>
): Promise<void> {
  const id = `sug-${Date.now()}`;
  const payload = cleanRestaurantData({
    ...suggestionData,
    id,
    createdAt: Date.now(),
    status: 'pending',
  });

  try {
    await setDoc(doc(db, SUGGESTIONS_PATH, id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SUGGESTIONS_PATH}/${id}`);
    throw error;
  }
}

/**
 * Public users submit suggested edits/corrections for an existing venue
 */
export async function submitPublicEditSuggestion(
  editData: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>
): Promise<void> {
  const id = `edit-sug-${Date.now()}`;
  const payload = {
    id,
    type: 'edit',
    createdAt: Date.now(),
    locationId: editData.locationId,
    locationName: editData.locationName,
    name: editData.locationName, // required by schema validation
    lat: 32.95, // default valid coords for schema validation
    lng: 35.35,
    isClosed: editData.isClosed,
    suggestedEdits: editData.suggestedEdits,
    description: editData.suggestedEdits,
    status: 'pending',
  };

  try {
    await setDoc(doc(db, SUGGESTIONS_PATH, id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SUGGESTIONS_PATH}/${id}`);
    throw error;
  }
}

/**
 * Admin updates suggestion status (approved / rejected / dismissed)
 */
export async function updateSuggestionStatusInFirestore(
  id: string,
  status: 'approved' | 'rejected' | 'dismissed'
): Promise<void> {
  try {
    await updateDoc(doc(db, SUGGESTIONS_PATH, id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SUGGESTIONS_PATH}/${id}`);
    throw error;
  }
}

/**
 * Admin deletes a suggestion document
 */
export async function deleteSuggestionFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SUGGESTIONS_PATH, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUGGESTIONS_PATH}/${id}`);
    throw error;
  }
}

/**
 * Safe One-Time Data Migration Tool:
 * Uploads local items to Firestore if they do not already exist (avoiding duplicates).
 */
export async function migrateLocalDataToFirestore(
  localLocations: FoodLocation[]
): Promise<{ added: number; skipped: number }> {
  try {
    // 1. Fetch current remote documents
    const snapshot = await getDocs(collection(db, RESTAURANTS_PATH));
    const remoteMap = new Map<string, string>(); // name.toLowerCase() -> id
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.name) {
        remoteMap.set(data.name.toLowerCase().trim(), docSnap.id);
      }
    });

    let addedCount = 0;
    let skippedCount = 0;

    for (const loc of localLocations) {
      const normalizedName = loc.name.toLowerCase().trim();
      if (remoteMap.has(normalizedName)) {
        skippedCount++;
      } else {
        const payload = cleanRestaurantData(loc);
        await setDoc(doc(db, RESTAURANTS_PATH, loc.id), payload);
        remoteMap.set(normalizedName, loc.id);
        addedCount++;
      }
    }

    return { added: addedCount, skipped: skippedCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, RESTAURANTS_PATH);
    throw error;
  }
}
