import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FoodLocation, LocationSuggestion, EditSuggestion } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// 1. RESTAURANTS SERVICE
// ----------------------------------------------------

/**
 * Subscribe to real-time updates for all approved restaurants in Firestore.
 */
export function subscribeToRestaurants(
  onUpdate: (restaurants: FoodLocation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const collectionRef = collection(db, 'restaurants');
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items: FoodLocation[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          locationName: data.locationName || '',
          lat: typeof data.lat === 'number' ? data.lat : 32.95,
          lng: typeof data.lng === 'number' ? data.lng : 35.35,
          cost: data.cost,
          hechsher: data.hechsher,
          recommendationType: data.recommendationType || 'official',
          description: data.description,
          websiteUrl: data.websiteUrl,
          phone: data.phone,
          openingHours: data.openingHours,
          imageUrl: data.imageUrl,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          addedByAdmin: data.addedByAdmin ?? true,
        };
      });
      // Sort by createdAt descending by default
      items.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(items);
    },
    (error) => {
      console.error('Snapshot error on restaurants:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'restaurants');
    }
  );
}

/**
 * Add a new restaurant document to Firestore.
 */
export async function addRestaurantToFirestore(
  data: Omit<FoodLocation, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<FoodLocation> {
  const id = data.id || `loc-${Date.now()}`;
  const path = `restaurants/${id}`;
  const now = data.createdAt || Date.now();

  const payload: FoodLocation = {
    ...data,
    id,
    createdAt: now,
    addedByAdmin: true,
  };

  try {
    // Sanitize undefined fields for Firestore
    const cleanPayload: Record<string, any> = {};
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined) cleanPayload[k] = v;
    });

    await setDoc(doc(db, 'restaurants', id), cleanPayload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update an existing restaurant document in Firestore.
 */
export async function updateRestaurantInFirestore(updated: FoodLocation): Promise<void> {
  const path = `restaurants/${updated.id}`;
  try {
    const cleanPayload: Record<string, any> = {};
    Object.entries(updated).forEach(([k, v]) => {
      if (v !== undefined) cleanPayload[k] = v;
    });

    await setDoc(doc(db, 'restaurants', updated.id), cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a restaurant document from Firestore.
 */
export async function deleteRestaurantFromFirestore(id: string): Promise<void> {
  const path = `restaurants/${id}`;
  try {
    await deleteDoc(doc(db, 'restaurants', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// 2. SUGGESTIONS SERVICE (New Place Submissions)
// ----------------------------------------------------

export function subscribeToSuggestions(
  onUpdate: (suggestions: LocationSuggestion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const collectionRef = collection(db, 'suggestions');
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items: LocationSuggestion[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          locationName: data.locationName || '',
          lat: typeof data.lat === 'number' ? data.lat : 32.95,
          lng: typeof data.lng === 'number' ? data.lng : 35.35,
          cost: data.cost,
          hechsher: data.hechsher,
          recommendationType: data.recommendationType || 'user',
          description: data.description,
          websiteUrl: data.websiteUrl,
          phone: data.phone,
          openingHours: data.openingHours,
          imageUrl: data.imageUrl,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          status: data.status || 'pending',
          submitterEmail: data.submitterEmail,
          adminNotes: data.adminNotes,
        };
      });
      items.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(items);
    },
    (error) => {
      console.warn('Subscription info for suggestions:', error);
      if (onError) onError(error);
    }
  );
}

export async function addSuggestionToFirestore(
  data: Omit<LocationSuggestion, 'id' | 'createdAt' | 'status'>
): Promise<LocationSuggestion> {
  const id = `sug-${Date.now()}`;
  const path = `suggestions/${id}`;
  const payload: LocationSuggestion = {
    ...data,
    id,
    createdAt: Date.now(),
    status: 'pending',
  };

  try {
    const cleanPayload: Record<string, any> = {};
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined) cleanPayload[k] = v;
    });

    await setDoc(doc(db, 'suggestions', id), cleanPayload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateSuggestionStatusInFirestore(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  adminNotes?: string
): Promise<void> {
  const path = `suggestions/${id}`;
  try {
    const payload: Record<string, any> = { status };
    if (adminNotes !== undefined) payload.adminNotes = adminNotes;
    await updateDoc(doc(db, 'suggestions', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSuggestionFromFirestore(id: string): Promise<void> {
  const path = `suggestions/${id}`;
  try {
    await deleteDoc(doc(db, 'suggestions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// 3. EDIT SUGGESTIONS SERVICE
// ----------------------------------------------------

export function subscribeToEditSuggestions(
  onUpdate: (edits: EditSuggestion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const collectionRef = collection(db, 'editSuggestions');
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items: EditSuggestion[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          locationId: data.locationId || '',
          locationName: data.locationName || '',
          isClosed: data.isClosed || 'No',
          suggestedEdits: data.suggestedEdits,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          status: data.status || 'pending',
        };
      });
      items.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(items);
    },
    (error) => {
      console.warn('Subscription info for editSuggestions:', error);
      if (onError) onError(error);
    }
  );
}

export async function addEditSuggestionToFirestore(
  data: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>
): Promise<EditSuggestion> {
  const id = `edit-sug-${Date.now()}`;
  const path = `editSuggestions/${id}`;
  const payload: EditSuggestion = {
    ...data,
    id,
    createdAt: Date.now(),
    status: 'pending',
  };

  try {
    const cleanPayload: Record<string, any> = {};
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined) cleanPayload[k] = v;
    });

    await setDoc(doc(db, 'editSuggestions', id), cleanPayload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateEditSuggestionStatusInFirestore(
  id: string,
  status: 'pending' | 'dismissed' | 'applied'
): Promise<void> {
  const path = `editSuggestions/${id}`;
  try {
    await updateDoc(doc(db, 'editSuggestions', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ----------------------------------------------------
// 4. ADMIN PRIVILEGES & ACCOUNTS SERVICE
// ----------------------------------------------------

/**
 * Check if the given UID or Email is an authorized administrator.
 */
export async function checkIsAdminUser(uid: string, email?: string | null): Promise<boolean> {
  if (email && email.toLowerCase() === '16thdoctor@gmail.com') {
    return true;
  }

  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      return data.role === 'admin';
    }
  } catch (err) {
    console.info('Not an admin or permission check:', err);
  }
  return false;
}

/**
 * Ensure an administrator record exists in Firestore for an authorized admin UID.
 */
export async function ensureAdminRecord(uid: string, email: string): Promise<void> {
  try {
    const adminRef = doc(db, 'admins', uid);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        uid,
        email,
        role: 'admin',
        createdAt: Date.now(),
      });
    }
  } catch (error) {
    console.warn('Could not auto-create admin doc:', error);
  }
}

// ----------------------------------------------------
// 5. ONE-TIME MIGRATION & SEEDING MECHANISM
// ----------------------------------------------------

/**
 * Safely migrate/seed existing initial data into Cloud Firestore if the collection is empty.
 * Guarantees zero duplicate records.
 */
export async function seedInitialRestaurantsIfEmpty(initialData: FoodLocation[]): Promise<number> {
  try {
    const snapshot = await getDocs(collection(db, 'restaurants'));
    if (snapshot.empty) {
      console.log('Firestore restaurants collection is empty. Starting safe one-time migration...');
      let count = 0;
      for (const loc of initialData) {
        const cleanPayload: Record<string, any> = {};
        Object.entries(loc).forEach(([k, v]) => {
          if (v !== undefined) cleanPayload[k] = v;
        });
        await setDoc(doc(db, 'restaurants', loc.id), cleanPayload);
        count++;
      }
      console.log(`Successfully migrated ${count} restaurants into Cloud Firestore.`);
      return count;
    }
    return 0;
  } catch (error) {
    console.warn('Failed to seed initial data to Firestore:', error);
    return 0;
  }
}
