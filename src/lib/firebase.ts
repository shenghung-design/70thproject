import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocFromServer, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  collectionGroup,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Project, Hotspot, Contact, ScheduleItem, HistoryLog } from '../types';

// Check if firebase config is populated
const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "");

let app: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    
    // Test connection as required by constraint
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("Firebase Initialization failed:", err);
  }
}

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  const result: any = {};
  for (const key of Object.keys(obj as any)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      result[key] = sanitizeForFirestore(val);
    }
  }
  return result;
}

export { app, db, isFirebaseConfigured };

// Standard Firestore Error wrapping schema as required by Phase 3 of the Firebase Integration Skill
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
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Multi-Tab Local Sync via BroadcastChannel (Works in standard browser previews instantly!)
const SYNC_CHANNEL_NAME = 'shenghong_70_sync_channel';
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel not supported in this environment:", e);
}

export function broadcastLocalUpdate(type: string, payload: any) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, payload, sender: window.name || 'tab_self' });
    } catch (err) {
      // Ignore broadcast errors
    }
  }
}

export function listenToLocalUpdates(onUpdate: (type: string, payload: any) => void) {
  if (broadcastChannel) {
    const handler = (event: MessageEvent) => {
      onUpdate(event.data.type, event.data.payload);
    };
    broadcastChannel.addEventListener('message', handler);
    return () => broadcastChannel?.removeEventListener('message', handler);
  }
  return () => {};
}
