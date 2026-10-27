import { User, UserType } from '../types/user';
import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AuthCredentials {
  email: string;
  password: string;
  fullName?: string;
  userType?: UserType;
  rememberMe?: boolean;
}

const USERS_COLLECTION = 'users';
const profileRequests = new Map<string, Promise<User | null>>();
const PROFILE_LOOKUP_TIMEOUT_MS = 5_000;
const PROFILE_WRITE_TIMEOUT_MS = 5_000;

function userRoleStorageKey(uid: string): string {
  return `userType:${uid}`;
}

function userRoleEmailStorageKey(email: string): string {
  return `userType:email:${email.trim().toLowerCase()}`;
}

export function getCachedUserType(uid: string, email = ''): UserType | null {
  const value = localStorage.getItem(userRoleStorageKey(uid)) ||
    (email ? localStorage.getItem(userRoleEmailStorageKey(email)) : null);
  return value === 'admin' || value === 'issuer' || value === 'recipient' ? value : null;
}

function cacheUserType(uid: string, userType: UserType, email = ''): void {
  localStorage.setItem(userRoleStorageKey(uid), userType);
  if (email) {
    localStorage.setItem(userRoleEmailStorageKey(email), userType);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Convert Firebase user & profile to our User type
const buildUserObject = (
  firebaseUser: FirebaseUser, 
  userType: UserType = 'recipient', 
  fullNameOverride?: string
): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    fullName: fullNameOverride || firebaseUser.displayName || '',
    userType: userType,
    certificates: []
  };
};

/**
 * Fetch a user profile document from Firestore.
 */
export const getUserProfile = (uid: string): Promise<User | null> => {
  const existingRequest = profileRequests.get(uid);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async (): Promise<User | null> => {
    if (!db) {
      const currentUser = auth?.currentUser;
      if (currentUser && currentUser.uid === uid) {
        return buildUserObject(
          currentUser,
          getCachedUserType(uid, currentUser.email || '') || 'recipient'
        );
      }
      return null;
    }

    try {
      const userDocRef = doc(db, USERS_COLLECTION, uid);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const userSnapshot = await Promise.race([
        getDoc(userDocRef),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Profile lookup timed out.')), PROFILE_LOOKUP_TIMEOUT_MS);
        }),
      ]).finally(() => {
        if (timeout) clearTimeout(timeout);
      });

      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        const storedUserType = data.userType;
        const profileUserType: UserType =
          storedUserType === 'admin' || storedUserType === 'issuer' || storedUserType === 'recipient'
            ? storedUserType
            : 'recipient';
        const email = data.email || auth?.currentUser?.email || '';
        const userType = getCachedUserType(uid, email) || profileUserType;
        cacheUserType(uid, userType, email);
        return {
          id: uid,
          email,
          fullName: data.fullName || '',
          userType,
          certificates: data.certificates || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }
    } catch (error) {
      if (error && (error.code === 'unavailable' || (error.message && error.message.includes('offline')))) {
        return null;
      }
      console.warn('Failed to fetch user profile from Firestore:', error);
    }

    return null;
  })().finally(() => {
    profileRequests.delete(uid);
  });

  profileRequests.set(uid, request);
  return request;
};

export const loginUser = async (credentials: AuthCredentials): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please check your configuration.');
  }

  // Session persistence – ignore any errors
  try {
    await setPersistence(
      auth,
      credentials.rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (error) {
    console.warn('Could not update Firebase Auth persistence:', error);
  }

  const userCredential = await signInWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  );
  const uid = userCredential.user.uid;
  const email = userCredential.user.email || credentials.email;

  // Parallel fetch of Firestore profile
  const profilePromise = getUserProfile(uid);
  let resolvedUser = await profilePromise;

  // If no profile exists, create a minimal one and write it in the background
  if (!resolvedUser) {
    const fallbackType =
      getCachedUserType(uid, email) ||
      'recipient';
    const fullName =
      userCredential.user.displayName || credentials.fullName || '';

    resolvedUser = {
      id: uid,
      email,
      fullName,
      userType: fallbackType,
      certificates: [],
    };

    if (db) {
      (async () => {
        try {
          await setDoc(doc(db, USERS_COLLECTION, uid), {
            id: uid,
            email: resolvedUser.email,
            fullName: resolvedUser.fullName,
            userType: resolvedUser.userType,
            certificates: [],
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('Could not initialize missing user doc in Firestore:', e);
        }
      })();
    }
    cacheUserType(uid, fallbackType, email);
  }

  cacheUserType(uid, resolvedUser.userType, resolvedUser.email);
  return resolvedUser;
};

export const loginWithGoogle = async (userType: UserType = 'recipient'): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const uid = result.user.uid;

    let userProfile = await getUserProfile(uid);
    if (!userProfile) {
      userProfile = {
        id: uid,
        email: result.user.email || '',
        fullName: result.user.displayName || '',
        userType: userType,
        certificates: [],
      };

      if (db) {
        try {
          await setDoc(doc(db, USERS_COLLECTION, uid), {
            id: uid,
            email: userProfile.email,
            fullName: userProfile.fullName,
            userType: userProfile.userType,
            certificates: [],
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } catch (err) {
          console.warn('Could not save Google user doc to Firestore:', err);
        }
      }
    }

    cacheUserType(uid, userProfile.userType, userProfile.email);
    return userProfile;
  } catch (error: any) {
    throw new Error(error.message || 'Google sign-in failed');
  }
};

export const registerUser = async (credentials: AuthCredentials): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    const user = userCredential.user;
    const fullName = credentials.fullName?.trim() || '';
    const userType: UserType = credentials.userType || 'recipient';
    cacheUserType(user.uid, userType, credentials.email);

    if (fullName) {
      void updateProfile(user, { displayName: fullName }).catch((profileError) => {
        console.warn('Failed to update displayName on Firebase user:', profileError);
      });
    }
    if (db) {
      void withTimeout(
        setDoc(doc(db, USERS_COLLECTION, user.uid), {
          id: user.uid,
          email: credentials.email,
          fullName,
          userType,
          certificates: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        PROFILE_WRITE_TIMEOUT_MS,
        'Saving your role profile timed out.'
      ).catch((firestoreError) => {
        console.error('Failed to save new user role/profile to Firestore:', firestoreError);
      });
    }

    return {
      id: user.uid,
      email: credentials.email,
      fullName: fullName,
      userType: userType,
      certificates: []
    };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const logoutUser = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
    localStorage.removeItem('userType');
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

export const updateUserProfile = async (
  userId: string, 
  data: Partial<Pick<User, 'fullName' | 'userType'>>
): Promise<void> => {
  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('No user is currently authenticated to update this profile');
  }

  if (data.fullName && currentUser) {
    await updateProfile(currentUser, { displayName: data.fullName });
  }

  if (data.userType) {
    cacheUserType(userId, data.userType, currentUser.email || '');
  }

  if (db) {
    void setDoc(doc(db, USERS_COLLECTION, userId), {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((error) => {
      console.warn('Could not synchronize profile changes to Firestore:', error);
    });
  }
};

export const getCurrentUser = (): User | null => {
  const firebaseUser = auth?.currentUser;
  
  if (firebaseUser) {
    const userType = getCachedUserType(firebaseUser.uid, firebaseUser.email || '') || 'recipient';
    return buildUserObject(firebaseUser, userType);
  }
  
  return null;
};
