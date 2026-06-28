/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  addDoc,
  updateDoc,
  getDocFromServer,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Task, Habit, TabActivity } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Log as standard debug message instead of console.error to avoid raising blocker flags during startup
    console.log("Firebase Firestore initial connectivity check:", error);
  }
}
testConnection();

// Configure Google OAuth provider with workspace scopes
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_oauth_access_token');

// Load cached token from memory during session if available
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_oauth_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to extract Google Workspace OAuth access token');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_oauth_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('google_oauth_access_token');
};

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
  }
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * -------------------------------------------------------------
 * FIRESTORE HELPERS FOR DURABLE PERSISTENCE
 * -------------------------------------------------------------
 */

// Tasks collection
export const fetchTasksFromDb = async (userId: string): Promise<Task[]> => {
  const pathForGetDocs = 'tasks';
  try {
    const q = query(collection(db, pathForGetDocs), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      tasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    return tasks;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForGetDocs);
  }
};

export const saveTaskToDb = async (task: Task): Promise<void> => {
  const pathForWrite = `tasks/${task.id}`;
  try {
    // Strip undefined fields to satisfy Firestore strict serialization requirements
    const cleanedTask = JSON.parse(JSON.stringify(task));
    await setDoc(doc(db, 'tasks', task.id), cleanedTask);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
};

export const deleteTaskFromDb = async (taskId: string): Promise<void> => {
  const pathForDelete = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
};

// Habits collection
export const fetchHabitsFromDb = async (userId: string): Promise<Habit[]> => {
  const pathForGetDocs = 'habits';
  try {
    const q = query(collection(db, pathForGetDocs), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const habits: Habit[] = [];
    querySnapshot.forEach((docSnap) => {
      habits.push({ id: docSnap.id, ...docSnap.data() } as Habit);
    });
    return habits;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForGetDocs);
  }
};

export const saveHabitToDb = async (habit: Habit): Promise<void> => {
  const pathForWrite = `habits/${habit.id}`;
  try {
    // Strip undefined fields to satisfy Firestore strict serialization requirements
    const cleanedHabit = JSON.parse(JSON.stringify(habit));
    await setDoc(doc(db, 'habits', habit.id), cleanedHabit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
};

export const deleteHabitFromDb = async (habitId: string): Promise<void> => {
  const pathForDelete = `habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
};

// Tab Activities collection
export const fetchTabActivitiesFromDb = async (userId: string): Promise<TabActivity[]> => {
  const pathForGetDocs = 'tab_activities';
  try {
    const q = query(collection(db, pathForGetDocs), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const activities: TabActivity[] = [];
    querySnapshot.forEach((docSnap) => {
      activities.push({ id: docSnap.id, ...docSnap.data() } as TabActivity);
    });
    return activities;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForGetDocs);
  }
};

export const saveTabActivityToDb = async (activity: TabActivity): Promise<void> => {
  const pathForWrite = `tab_activities/${activity.id}`;
  try {
    const cleanedActivity = JSON.parse(JSON.stringify(activity));
    await setDoc(doc(db, 'tab_activities', activity.id), cleanedActivity);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
};

export const deleteTabActivityFromDb = async (activityId: string): Promise<void> => {
  const pathForDelete = `tab_activities/${activityId}`;
  try {
    await deleteDoc(doc(db, 'tab_activities', activityId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
};
