import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const ADMIN_INTERNAL_EMAIL = 'admin@foodeejewdee.co.uk';

export interface AdminPrivilegeResult {
  isAdmin: boolean;
  code?: string;
  message?: string;
}

/**
 * Check server-side authorization record in /admins/{uid} collection
 * Returns detailed diagnostic information on failure.
 */
export async function checkAdminPrivilegeDetails(uid: string): Promise<AdminPrivilegeResult> {
  try {
    const adminDocRef = doc(db, 'admins', uid);
    const snap = await getDoc(adminDocRef);
    if (!snap.exists()) {
      return {
        isAdmin: false,
        code: 'admin-document-not-found',
        message: `Firebase Auth succeeded for ${ADMIN_INTERNAL_EMAIL} (UID: ${uid}), but document /admins/${uid} was not found in Firestore.`,
      };
    }
    const data = snap.data();
    if (data?.role !== 'admin') {
      return {
        isAdmin: false,
        code: 'invalid-admin-role',
        message: `Firebase Auth succeeded for ${ADMIN_INTERNAL_EMAIL} (UID: ${uid}), but document /admins/${uid} has role "${data?.role}" instead of "admin".`,
      };
    }
    return { isAdmin: true };
  } catch (err: any) {
    console.warn('Admin check error:', err);
    return {
      isAdmin: false,
      code: err?.code || 'permission-denied',
      message: `Firebase Auth succeeded for ${ADMIN_INTERNAL_EMAIL} (UID: ${uid}), but Firestore permission/network check failed: ${err?.message || err?.code || 'permission-denied'}.`,
    };
  }
}

/**
 * Check server-side authorization record in /admins/{uid} collection (boolean helper)
 */
export async function checkAdminPrivilege(uid: string): Promise<boolean> {
  const result = await checkAdminPrivilegeDetails(uid);
  return result.isAdmin;
}

/**
 * Sign in administrator using Username ("admin") and Password.
 * Maps username "admin" to internal email "admin@foodeejewdee.co.uk" for Firebase Auth.
 * Throws errors with diagnostic codes on failure.
 */
export async function loginAdminWithUsername(
  usernameInput: string,
  pass: string
): Promise<{ user: User; isAdmin: boolean }> {
  const normalizedUsername = usernameInput.trim().toLowerCase();
  if (normalizedUsername !== 'admin') {
    const err: any = new Error("Username must be 'admin'");
    err.code = 'invalid-username';
    throw err;
  }

  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, ADMIN_INTERNAL_EMAIL, pass);
  } catch (authErr: any) {
    // Preserve Firebase Auth error code (e.g., auth/invalid-credential, auth/user-not-found, auth/wrong-password)
    throw authErr;
  }

  const user = credential.user;
  const adminCheck = await checkAdminPrivilegeDetails(user.uid);

  if (!adminCheck.isAdmin) {
    await firebaseSignOut(auth);
    const err: any = new Error(adminCheck.message || 'Administrator authorization failed.');
    err.code = adminCheck.code || 'admin-document-not-found';
    err.uid = user.uid;
    throw err;
  }

  return { user, isAdmin: true };
}

/**
 * Sign out administrator
 */
export async function logoutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Listen to auth state changes and verify server-side admin document
 */
export function subscribeToAuthChanges(
  onChange: (user: User | null, isAdmin: boolean) => void
) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const isAdmin = await checkAdminPrivilege(user.uid);
      if (isAdmin) {
        onChange(user, true);
      } else {
        onChange(null, false);
      }
    } else {
      onChange(null, false);
    }
  });
}

