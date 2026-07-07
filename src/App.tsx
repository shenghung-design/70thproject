import React, { useState, useEffect } from 'react';
import { Project, Hotspot, Contact, ScheduleItem, HistoryLog, OptionLibrary } from './types';
import { 
  DEFAULT_PROJECTS, 
  DEFAULT_HOTSPOTS, 
  DEFAULT_SCHEDULE_ITEMS, 
  DEFAULT_CONTACTS, 
  DEFAULT_DEPARTMENTS, 
  DEFAULT_OWNERS, 
  DEFAULT_DESIGNERS,
  DEFAULT_VENDORS,
  DEFAULT_STATUSES
} from './initialData';

import HeaderBanner from './components/HeaderBanner';
import ImageHotspotMapper from './components/ImageHotspotMapper';
import ScheduleGrid from './components/ScheduleGrid';
import ContactCardModal from './components/ContactCardModal';
import OptionLibraryModal from './components/OptionLibraryModal';
import AuditHistoryModal from './components/AuditHistoryModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { 
  isFirebaseConfigured, 
  db, 
  auth,
  broadcastLocalUpdate, 
  listenToLocalUpdates,
  OperationType,
  handleFirestoreError,
  sanitizeForFirestore
} from './lib/firebase';

import { onAuthStateChanged } from 'firebase/auth';

import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocs,
  collectionGroup
} from 'firebase/firestore';

// Helper to generate UUIDs safely in React
const generateUUID = () => {
  return 'id_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper to write to local storage safely to prevent QuotaExceededError when attachments are large
const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`LocalStorage write failed (quota exceeded or disallowed) for key: ${key}`, e);
  }
};

// Robust helper to compress high-res/PNG images to under 800KB jpeg before sending to Firestore
const compressBase64IfNeeded = (base64: string, maxBytes: number = 750 * 1024): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64 || !base64.startsWith('data:image/') || base64.length < maxBytes) {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as jpeg with 0.65 quality to guarantee it's under 800KB
        const compressed = canvas.toDataURL('image/jpeg', 0.65);
        resolve(compressed);
      } catch (err) {
        console.warn('Compression failed, using original', err);
        resolve(base64);
      }
    };
    img.onerror = () => {
      resolve(base64);
    };
    img.src = base64;
  });
};

export default function App() {
  // --- Core Application State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('project_70th_box');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [owners, setOwners] = useState<string[]>(DEFAULT_OWNERS);
  const [vendors, setVendors] = useState<string[]>(DEFAULT_VENDORS);
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [designers, setDesigners] = useState<string[]>(DEFAULT_DESIGNERS);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);

  // Monitor Auth state changes to prevent permission-denied errors on startup race condition
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);
  
  // Active editing user/unit for co-editing attribution
  const [currentUserUnit, setCurrentUserUnit] = useState<string>(() => {
    return localStorage.getItem('sh_user_unit') || '勝陽';
  });

  const [userUnits, setUserUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('sh_user_units');
    return saved ? JSON.parse(saved) : ['勝陽', '企劃部', '廠務課'];
  });

  useEffect(() => {
    localStorage.setItem('sh_user_unit', currentUserUnit);
  }, [currentUserUnit]);

  useEffect(() => {
    localStorage.setItem('sh_user_units', JSON.stringify(userUnits));
  }, [userUnits]);

  // --- UI/Modal States ---
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [associatedItemId, setAssociatedItemId] = useState<string | null>(null); // To link contact creation back to a row item

  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [optionModalDefaultTab, setOptionModalDefaultTab] = useState<'departments' | 'owners' | 'vendors' | 'statuses' | 'designers'>('owners');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // --- Custom Dialog States ---
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // --- Initial Loading / Local Storage Bootstrap ---
  useEffect(() => {
    // Check local storage first
    const localProjects = localStorage.getItem('sh_projects');
    const localHotspots = localStorage.getItem('sh_hotspots');
    const localContacts = localStorage.getItem('sh_contacts');
    const localItems = localStorage.getItem('sh_items');
    const localDepts = localStorage.getItem('sh_departments');
    const localOwners = localStorage.getItem('sh_owners');
    const localVendors = localStorage.getItem('sh_vendors');
    const localStatuses = localStorage.getItem('sh_statuses');
    const localDesigners = localStorage.getItem('sh_designers');
    const localLogs = localStorage.getItem('sh_logs');

    if (localProjects) {
      setProjects(JSON.parse(localProjects));
    } else {
      setProjects(DEFAULT_PROJECTS);
      safeSetLocalStorage('sh_projects', JSON.stringify(DEFAULT_PROJECTS));
    }

    if (localHotspots) {
      setHotspots(JSON.parse(localHotspots));
    } else {
      setHotspots(DEFAULT_HOTSPOTS);
      safeSetLocalStorage('sh_hotspots', JSON.stringify(DEFAULT_HOTSPOTS));
    }

    if (localContacts) {
      setContacts(JSON.parse(localContacts));
    } else {
      setContacts(DEFAULT_CONTACTS);
      safeSetLocalStorage('sh_contacts', JSON.stringify(DEFAULT_CONTACTS));
    }

    if (localItems) {
      setScheduleItems(JSON.parse(localItems));
    } else {
      setScheduleItems(DEFAULT_SCHEDULE_ITEMS);
      safeSetLocalStorage('sh_items', JSON.stringify(DEFAULT_SCHEDULE_ITEMS));
    }

    if (localDepts) setDepartments(JSON.parse(localDepts));
    if (localOwners) setOwners(JSON.parse(localOwners));
    if (localVendors) setVendors(JSON.parse(localVendors));
    
    if (localStatuses) {
      setStatuses(JSON.parse(localStatuses));
    } else {
      setStatuses(DEFAULT_STATUSES);
      safeSetLocalStorage('sh_statuses', JSON.stringify(DEFAULT_STATUSES));
    }

    if (localDesigners) {
      setDesigners(JSON.parse(localDesigners));
    } else {
      setDesigners(DEFAULT_DESIGNERS);
      safeSetLocalStorage('sh_designers', JSON.stringify(DEFAULT_DESIGNERS));
    }

    if (localLogs) {
      setHistoryLogs(JSON.parse(localLogs));
    } else {
      setHistoryLogs([]);
    }
  }, []);

  // --- BroadcastChannel Real-time Multi-Tab listener ---
  useEffect(() => {
    const unsubscribe = listenToLocalUpdates((type, payload) => {
      // Receive updates from another open browser tab and sync instantly!
      switch (type) {
        case 'SYNC_PROJECTS':
          setProjects(payload);
          safeSetLocalStorage('sh_projects', JSON.stringify(payload));
          break;
        case 'SYNC_HOTSPOTS':
          setHotspots(payload);
          safeSetLocalStorage('sh_hotspots', JSON.stringify(payload));
          break;
        case 'SYNC_CONTACTS':
          setContacts(payload);
          safeSetLocalStorage('sh_contacts', JSON.stringify(payload));
          break;
        case 'SYNC_ITEMS':
          setScheduleItems(payload);
          safeSetLocalStorage('sh_items', JSON.stringify(payload));
          break;
        case 'SYNC_OPTIONS':
          if (payload.departments) {
            setDepartments(payload.departments);
            safeSetLocalStorage('sh_departments', JSON.stringify(payload.departments));
          }
          if (payload.owners) {
            setOwners(payload.owners);
            safeSetLocalStorage('sh_owners', JSON.stringify(payload.owners));
          }
          if (payload.vendors) {
            setVendors(payload.vendors);
            safeSetLocalStorage('sh_vendors', JSON.stringify(payload.vendors));
          }
          if (payload.statuses) {
            setStatuses(payload.statuses);
            safeSetLocalStorage('sh_statuses', JSON.stringify(payload.statuses));
          }
          if (payload.designers) {
            setDesigners(payload.designers);
            safeSetLocalStorage('sh_designers', JSON.stringify(payload.designers));
          }
          break;
        case 'SYNC_LOGS':
          setHistoryLogs(payload);
          safeSetLocalStorage('sh_logs', JSON.stringify(payload));
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [projects, hotspots, contacts, scheduleItems, departments, owners, vendors, statuses, designers, historyLogs]);

  // --- Firestore Real-time Multi-Device synchronization listener ---
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !isAuthReady) return;

    console.log("Initializing Firestore listeners.");

    // 1. Sync projects (and seed default data if database is empty)
    const unsubProjects = onSnapshot(collection(db, 'projects'), async (snapshot) => {
      setIsFirebaseConnected(true);
      console.log("Firestore projects snapshot received. Count:", snapshot.size);

      if (snapshot.empty) {
        console.log("Firestore database is empty. Seeding default data...");
        try {
          const batch = writeBatch(db!);
          
          // Seed projects
          DEFAULT_PROJECTS.forEach(p => {
            batch.set(doc(db!, 'projects', p.id), sanitizeForFirestore(p));
          });
          
          // Seed hotspots
          DEFAULT_HOTSPOTS.forEach(h => {
            batch.set(doc(db!, 'projects', h.projectId, 'hotspots', h.id), sanitizeForFirestore(h));
          });
          
          // Seed schedule items
          DEFAULT_SCHEDULE_ITEMS.forEach(item => {
            batch.set(doc(db!, 'projects', item.projectId, 'items', item.id), sanitizeForFirestore(item));
          });
          
          // Seed contacts
          DEFAULT_CONTACTS.forEach(c => {
            batch.set(doc(db!, 'contacts', c.id), sanitizeForFirestore(c));
          });
          
          // Seed options library
          const initialOptions = {
            departments: DEFAULT_DEPARTMENTS,
            owners: DEFAULT_OWNERS,
            vendors: DEFAULT_VENDORS,
            statuses: DEFAULT_STATUSES,
            designers: DEFAULT_DESIGNERS
          };
          batch.set(doc(db!, 'options', 'library'), sanitizeForFirestore(initialOptions));
          
          await batch.commit();
          console.log("Firestore default data seeded successfully.");
        } catch (err) {
          console.error("Failed to seed default data:", err);
        }
      } else {
        const projs: Project[] = [];
        snapshot.forEach((doc) => {
          projs.push(doc.data() as Project);
        });
        setProjects(projs.sort((a, b) => a.createdAt - b.createdAt));
        safeSetLocalStorage('sh_projects', JSON.stringify(projs));
      }
    }, (error) => {
      console.error("Firestore projects stream error:", error);
      setIsFirebaseConnected(false);
      handleFirestoreError(error, OperationType.GET, 'projects');
    });

    // 2. Sync all hotspots dynamically across all projects
    const unsubHotspots = onSnapshot(collectionGroup(db, 'hotspots'), (snapshot) => {
      setIsFirebaseConnected(true);
      const spots: Hotspot[] = [];
      snapshot.forEach((doc) => {
        spots.push(doc.data() as Hotspot);
      });
      setHotspots(spots);
      safeSetLocalStorage('sh_hotspots', JSON.stringify(spots));
    }, (error) => {
      console.error("Firestore hotspots stream error:", error);
      setIsFirebaseConnected(false);
      handleFirestoreError(error, OperationType.GET, 'hotspots collectionGroup');
    });

    // 3. Sync all schedule items across all projects
    const unsubItems = onSnapshot(collectionGroup(db, 'items'), (snapshot) => {
      setIsFirebaseConnected(true);
      const items: ScheduleItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as ScheduleItem);
      });
      setScheduleItems(items);
      safeSetLocalStorage('sh_items', JSON.stringify(items));
    }, (error) => {
      console.error("Firestore items stream error:", error);
      setIsFirebaseConnected(false);
      handleFirestoreError(error, OperationType.GET, 'items collectionGroup');
    });

    // 4. Sync contacts list
    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setIsFirebaseConnected(true);
      const cts: Contact[] = [];
      snapshot.forEach((doc) => {
        cts.push(doc.data() as Contact);
      });
      if (cts.length > 0) {
        setContacts(cts);
        safeSetLocalStorage('sh_contacts', JSON.stringify(cts));
      }
    }, (error) => {
      console.error("Firestore contacts stream error:", error);
      setIsFirebaseConnected(false);
      handleFirestoreError(error, OperationType.GET, 'contacts');
    });

    // 5. Sync Option library
    const unsubOptions = onSnapshot(collection(db, 'options'), (snapshot) => {
      setIsFirebaseConnected(true);
      snapshot.forEach((docSnap) => {
        if (docSnap.id === 'library') {
          const data = docSnap.data() as OptionLibrary;
          if (data.departments) {
            setDepartments(data.departments);
            safeSetLocalStorage('sh_departments', JSON.stringify(data.departments));
          }
          if (data.owners) {
            setOwners(data.owners);
            safeSetLocalStorage('sh_owners', JSON.stringify(data.owners));
          }
          if (data.vendors) {
            setVendors(data.vendors);
            safeSetLocalStorage('sh_vendors', JSON.stringify(data.vendors));
          }
          if (data.statuses) {
            setStatuses(data.statuses);
            safeSetLocalStorage('sh_statuses', JSON.stringify(data.statuses));
          }
          if (data.designers) {
            setDesigners(data.designers);
            safeSetLocalStorage('sh_designers', JSON.stringify(data.designers));
          }
        }
      });
    }, (error) => {
      console.error("Firestore options stream error:", error);
      setIsFirebaseConnected(false);
      handleFirestoreError(error, OperationType.GET, 'options');
    });

    // 6. Sync History logs
    const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      setIsFirebaseConnected(true);
      const logs: HistoryLog[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as HistoryLog);
      });
      const sorted = logs.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryLogs(sorted);
      safeSetLocalStorage('sh_logs', JSON.stringify(sorted));
    }, (error) => {
      console.error("Firestore logs stream error:", error);
      setIsFirebaseConnected(false);
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    return () => {
      unsubProjects();
      unsubHotspots();
      unsubItems();
      unsubContacts();
      unsubOptions();
      unsubLogs();
    };
  }, [isFirebaseConfigured, isAuthReady]);

  // --- Abstract State Mutation Wrapper (Syncs both locally & to Cloud Firestore) ---
  const saveStateAndSync = async (
    type: 'PROJECTS' | 'HOTSPOTS' | 'CONTACTS' | 'ITEMS' | 'OPTIONS' | 'LOGS',
    newPayload: any,
    firestoreOperations?: () => Promise<void>
  ) => {
    // 1. Update React Local States and local localStorage
    if (type === 'PROJECTS') {
      setProjects(newPayload);
      safeSetLocalStorage('sh_projects', JSON.stringify(newPayload));
      broadcastLocalUpdate('SYNC_PROJECTS', newPayload);
    } else if (type === 'HOTSPOTS') {
      setHotspots(newPayload);
      safeSetLocalStorage('sh_hotspots', JSON.stringify(newPayload));
      broadcastLocalUpdate('SYNC_HOTSPOTS', newPayload);
    } else if (type === 'CONTACTS') {
      setContacts(newPayload);
      safeSetLocalStorage('sh_contacts', JSON.stringify(newPayload));
      broadcastLocalUpdate('SYNC_CONTACTS', newPayload);
    } else if (type === 'ITEMS') {
      setScheduleItems(newPayload);
      safeSetLocalStorage('sh_items', JSON.stringify(newPayload));
      broadcastLocalUpdate('SYNC_ITEMS', newPayload);
    } else if (type === 'OPTIONS') {
      if (newPayload.departments) {
        setDepartments(newPayload.departments);
        safeSetLocalStorage('sh_departments', JSON.stringify(newPayload.departments));
      }
      if (newPayload.owners) {
        setOwners(newPayload.owners);
        safeSetLocalStorage('sh_owners', JSON.stringify(newPayload.owners));
      }
      if (newPayload.vendors) {
        setVendors(newPayload.vendors);
        safeSetLocalStorage('sh_vendors', JSON.stringify(newPayload.vendors));
      }
      if (newPayload.statuses) {
        setStatuses(newPayload.statuses);
        safeSetLocalStorage('sh_statuses', JSON.stringify(newPayload.statuses));
      }
      if (newPayload.designers) {
        setDesigners(newPayload.designers);
        safeSetLocalStorage('sh_designers', JSON.stringify(newPayload.designers));
      }
      broadcastLocalUpdate('SYNC_OPTIONS', newPayload);
    } else if (type === 'LOGS') {
      setHistoryLogs(newPayload);
      safeSetLocalStorage('sh_logs', JSON.stringify(newPayload));
      broadcastLocalUpdate('SYNC_LOGS', newPayload);
    }

    // 2. Perform safe Firestore mutations in background if active
    if (isFirebaseConfigured && db && isAuthReady && auth?.currentUser && firestoreOperations) {
      try {
        await firestoreOperations();
      } catch (err) {
        console.error("Firestore sync write failed, fallback active:", err);
      }
    }
  };

  // Helper to append a history log entry
  const addLogEntry = (
    actionType: 'create' | 'update' | 'delete' | 'restore',
    entityType: 'project' | 'hotspot' | 'item' | 'option' | 'contact',
    description: string,
    details?: any
  ) => {
    const newLog: HistoryLog = {
      id: generateUUID(),
      projectId: activeProjectId,
      timestamp: Date.now(),
      userName: currentUserUnit || '勝宏總部',
      actionType,
      entityType,
      description,
      details: details !== undefined ? details : null
    };

    const updatedLogs = [newLog, ...historyLogs];
    saveStateAndSync('LOGS', updatedLogs, async () => {
      try {
        await setDoc(doc(db, 'logs', newLog.id), sanitizeForFirestore(newLog));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `logs/${newLog.id}`);
      }
    });
  };

  // --- Project Management Actions ---
  const handleAddProject = (name: string, templateType: 'diagram' | 'checklist') => {
    const newProj: Project = {
      id: 'project_' + generateUUID(),
      name: `🎉 ${name}`,
      imageSrc: '', // Defaults to paulownia wooden box schematic
      templateType,
      createdAt: Date.now()
    };

    const updated = [...projects, newProj];
    saveStateAndSync('PROJECTS', updated, async () => {
      try {
        const compressedImg = await compressBase64IfNeeded(newProj.imageSrc || '');
        const sanitizedProj = sanitizeForFirestore({ ...newProj, imageSrc: compressedImg });
        await setDoc(doc(db, 'projects', newProj.id), sanitizedProj);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${newProj.id}`);
      }
    });

    addLogEntry('create', 'project', `建立了新專案分頁「${name}」(${templateType === 'diagram' ? '圖面標註版型' : '純明細項目版型'})`);
  };

  const handleRenameProject = (id: string, newName: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, name: newName } : p);
    saveStateAndSync('PROJECTS', updated, async () => {
      try {
        const proj = updated.find(p => p.id === id);
        if (proj) {
          const compressedImg = await compressBase64IfNeeded(proj.imageSrc || '');
          const sanitizedProj = sanitizeForFirestore({ ...proj, imageSrc: compressedImg });
          await setDoc(doc(db, 'projects', id), sanitizedProj);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${id}`);
      }
    });
    addLogEntry('update', 'project', `將專案重命名為「${newName}」`);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      setCustomAlert('必須保留至少一個專案，無法刪除最後一個專案！');
      return;
    }
    setProjectToDeleteId(id);
  };

  const confirmDeleteProject = () => {
    if (!projectToDeleteId) return;
    const id = projectToDeleteId;
    const projToDelete = projects.find(p => p.id === id);
    if (!projToDelete) {
      setProjectToDeleteId(null);
      return;
    }

    const updatedProjects = projects.filter(p => p.id !== id);
    const updatedHotspots = hotspots.filter(h => h.projectId !== id);
    const updatedItems = scheduleItems.filter(i => i.projectId !== id);

    saveStateAndSync('PROJECTS', updatedProjects, async () => {
      try {
        const batch = writeBatch(db!);
        
        // 1. Delete main project document
        batch.delete(doc(db!, 'projects', id));
        
        // 2. Delete all hotspots of this project in Firestore
        const projectHotspots = hotspots.filter(h => h.projectId === id);
        projectHotspots.forEach(h => {
          batch.delete(doc(db!, 'projects', id, 'hotspots', h.id));
        });
        
        // 3. Delete all items of this project in Firestore
        const projectItems = scheduleItems.filter(item => item.projectId === id);
        projectItems.forEach(item => {
          batch.delete(doc(db!, 'projects', id, 'items', item.id));
        });
        
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `projects/${id}`);
      }
    });

    saveStateAndSync('HOTSPOTS', updatedHotspots);
    saveStateAndSync('ITEMS', updatedItems);

    // Pick another project
    const fallbackProj = updatedProjects[0];
    if (fallbackProj) {
      setActiveProjectId(fallbackProj.id);
    }

    addLogEntry('delete', 'project', `刪除了專案「${projToDelete.name}」`);
    setProjectToDeleteId(null);
  };

  const handleUpdateProjectImage = (base64: string) => {
    const updated = projects.map(p => p.id === activeProjectId ? { ...p, imageSrc: base64 } : p);
    saveStateAndSync('PROJECTS', updated, async () => {
      try {
        const activeProj = updated.find(p => p.id === activeProjectId);
        if (activeProj) {
          const compressedImg = await compressBase64IfNeeded(activeProj.imageSrc || '');
          const sanitizedProj = sanitizeForFirestore({ ...activeProj, imageSrc: compressedImg });
          await setDoc(doc(db, 'projects', activeProjectId), sanitizedProj);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}`);
      }
    });

    addLogEntry('update', 'project', `更新了此專案的禮盒設計示意圖`);
  };

  const handleUpdateProjectDiagramName = (id: string, newDiagramName: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, diagramName: newDiagramName } : p);
    saveStateAndSync('PROJECTS', updated, async () => {
      try {
        const proj = updated.find(p => p.id === id);
        if (proj) {
          const compressedImg = await compressBase64IfNeeded(proj.imageSrc || '');
          const sanitizedProj = sanitizeForFirestore({ ...proj, imageSrc: compressedImg });
          await setDoc(doc(db, 'projects', id), sanitizedProj);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${id}`);
      }
    });

    addLogEntry('update', 'project', `將圖檔名稱修改為「${newDiagramName}」`);
  };

  // --- Hotspot and Connected Schedule Item Actions ---
  const handleAddHotspot = (code: string, name: string, x: number, y: number) => {
    const hotspotId = 'hotspot_' + generateUUID();
    const newHotspot: Hotspot = {
      id: hotspotId,
      projectId: activeProjectId,
      code,
      name,
      x,
      y
    };

    const itemId = 'item_' + hotspotId;
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 10);
    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const newScheduleItem: ScheduleItem = {
      id: itemId,
      projectId: activeProjectId,
      hotspotId: hotspotId,
      code,
      name,
      department: '',
      owner: '',
      designer: '',
      vendor: '',
      contactId: null,
      proofDeadline: formatDate(today),
      completionDate: formatDate(tomorrow),
      isCompleted: false
    };

    const updatedHotspots = [...hotspots, newHotspot];
    const updatedItems = [...scheduleItems, newScheduleItem];

    saveStateAndSync('HOTSPOTS', updatedHotspots, async () => {
      try {
        await setDoc(doc(db, 'projects', activeProjectId, 'hotspots', hotspotId), sanitizeForFirestore(newHotspot));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/hotspots/${hotspotId}`);
      }
    });

    saveStateAndSync('ITEMS', updatedItems, async () => {
      try {
        await setDoc(doc(db, 'projects', activeProjectId, 'items', itemId), sanitizeForFirestore(newScheduleItem));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/items/${itemId}`);
      }
    });

    addLogEntry('create', 'hotspot', `在示意圖新增了標註點 [${code}] ${name}，並同步建立了同名進度檢核項目`);
  };

  const handleEditHotspot = (hotspotId: string, updatedCode: string, updatedName: string) => {
    const spotToUpdate = hotspots.find(h => h.id === hotspotId);
    if (!spotToUpdate) return;

    const updatedHotspots = hotspots.map(h => 
      h.id === hotspotId ? { ...h, code: updatedCode, name: updatedName } : h
    );
    const updatedItems = scheduleItems.map(item => 
      item.hotspotId === hotspotId ? { ...item, code: updatedCode, name: updatedName } : item
    );

    saveStateAndSync('HOTSPOTS', updatedHotspots, async () => {
      try {
        await setDoc(doc(db, 'projects', activeProjectId, 'hotspots', hotspotId), sanitizeForFirestore({
          ...spotToUpdate,
          code: updatedCode,
          name: updatedName
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/hotspots/${hotspotId}`);
      }
    });

    saveStateAndSync('ITEMS', updatedItems, async () => {
      try {
        const itemToUpdate = updatedItems.find(i => i.hotspotId === hotspotId);
        if (itemToUpdate) {
          await setDoc(doc(db, 'projects', activeProjectId, 'items', itemToUpdate.id), sanitizeForFirestore(itemToUpdate));
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/items/item_${hotspotId}`);
      }
    });

    addLogEntry('update', 'hotspot', `修改了標註點資訊為 [${updatedCode}] ${updatedName}`);
  };

  const handleDeleteHotspot = (hotspotId: string) => {
    const spotToDelete = hotspots.find(h => h.id === hotspotId);
    const itemToDelete = scheduleItems.find(i => i.hotspotId === hotspotId);
    if (!spotToDelete) return;

    const updatedHotspots = hotspots.filter(h => h.id !== hotspotId);
    const updatedItems = scheduleItems.filter(i => i.hotspotId !== hotspotId);

    const projId = spotToDelete.projectId || activeProjectId;

    saveStateAndSync('HOTSPOTS', updatedHotspots, async () => {
      try {
        await deleteDoc(doc(db, 'projects', projId, 'hotspots', hotspotId));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `projects/${projId}/hotspots/${hotspotId}`);
      }
    });

    saveStateAndSync('ITEMS', updatedItems, async () => {
      try {
        if (itemToDelete) {
          await deleteDoc(doc(db, 'projects', projId, 'items', itemToDelete.id));
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `projects/${projId}/items/${itemToDelete?.id || `item_${hotspotId}`}`);
      }
    });

    // Save details for Restoration (Undo capability!)
    addLogEntry(
      'delete', 
      'hotspot', 
      `刪除了標註點 [${spotToDelete.code}] ${spotToDelete.name} 及對應排程`,
      { hotspot: spotToDelete, item: itemToDelete }
    );
  };

  const handleMoveHotspot = (hotspotId: string, x: number, y: number) => {
    const updatedHotspots = hotspots.map(h => 
      h.id === hotspotId ? { ...h, x, y } : h
    );
    
    saveStateAndSync('HOTSPOTS', updatedHotspots, async () => {
      try {
        const spot = updatedHotspots.find(h => h.id === hotspotId);
        if (spot) {
          await setDoc(doc(db, 'projects', activeProjectId, 'hotspots', hotspotId), sanitizeForFirestore(spot));
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/hotspots/${hotspotId}`);
      }
    });
  };

  // --- Dynamic Schedule Grid Row Actions ---
  const handleAddNewManualItem = () => {
    const itemId = 'manual_' + generateUUID();
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 10);
    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const newItem: ScheduleItem = {
      id: itemId,
      projectId: activeProjectId,
      hotspotId: null,
      code: '',
      name: '新增手動獨立項目',
      department: '',
      owner: '',
      designer: '',
      vendor: '',
      contactId: null,
      proofDeadline: formatDate(today),
      completionDate: formatDate(tomorrow),
      isCompleted: false
    };

    const updated = [...scheduleItems, newItem];
    saveStateAndSync('ITEMS', updated, async () => {
      try {
        await setDoc(doc(db, 'projects', activeProjectId, 'items', itemId), sanitizeForFirestore(newItem));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/items/${itemId}`);
      }
    });

    addLogEntry('create', 'item', `手動新增了一筆不綁定圖片的獨立排程項目「新增手動獨立項目」`);
  };

  const handleUpdateScheduleItem = (itemId: string, field: keyof ScheduleItem | Partial<ScheduleItem>, value?: any) => {
    const itemToUpdate = scheduleItems.find(i => i.id === itemId);
    if (!itemToUpdate) return;

    let updatedFields: Partial<ScheduleItem> = {};
    if (typeof field === 'object' && field !== null) {
      updatedFields = field as Partial<ScheduleItem>;
    } else {
      updatedFields = { [field as string]: value };
    }

    const updated = scheduleItems.map(item => 
      item.id === itemId ? { ...item, ...updatedFields } : item
    );

    saveStateAndSync('ITEMS', updated, async () => {
      try {
        await setDoc(doc(db, 'projects', activeProjectId, 'items', itemId), sanitizeForFirestore({
          ...itemToUpdate,
          ...updatedFields
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/items/${itemId}`);
      }
    });

    // Throttle or simplified description logging to prevent pollution
    if ('isCompleted' in updatedFields) {
      const stateText = updatedFields.isCompleted ? '已完成' : '未完成';
      addLogEntry('update', 'item', `更新了排程項目「${itemToUpdate.name}」的完工狀態為: ${stateText}`);
    } else if ('name' in updatedFields) {
      addLogEntry('update', 'item', `修改了手動排程項目名稱為「${updatedFields.name}」`);
    }
  };

  const handleDeleteScheduleItem = (itemId: string) => {
    const itemToDelete = scheduleItems.find(i => i.id === itemId);
    if (!itemToDelete) return;

    // If it was bound to a hotspot, also delete the hotspot to maintain integrity
    const boundHotspot = hotspots.find(h => h.id === itemToDelete.hotspotId);

    const updatedItems = scheduleItems.filter(i => i.id !== itemId);
    const updatedHotspots = boundHotspot 
      ? hotspots.filter(h => h.id !== boundHotspot.id) 
      : hotspots;

    const projId = itemToDelete.projectId || activeProjectId;

    if (boundHotspot) {
      saveStateAndSync('HOTSPOTS', updatedHotspots, async () => {
        try {
          await deleteDoc(doc(db, 'projects', projId, 'hotspots', boundHotspot.id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `projects/${projId}/hotspots/${boundHotspot.id}`);
        }
      });
    }

    saveStateAndSync('ITEMS', updatedItems, async () => {
      try {
        await deleteDoc(doc(db, 'projects', projId, 'items', itemId));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `projects/${projId}/items/${itemId}`);
      }
    });

    addLogEntry(
      'delete', 
      'item', 
      `刪除了排程項目「${itemToDelete.name}」${boundHotspot ? `及其對應標註點 [${boundHotspot.code}]` : ''}`,
      { item: itemToDelete, hotspot: boundHotspot }
    );
  };

  // --- Restoration Undo Handler ---
  const handleRestoreItem = (log: HistoryLog) => {
    if (!log.details) return;
    const { item, hotspot } = log.details;

    if (hotspot) {
      const updatedHotspots = [...hotspots, hotspot];
      saveStateAndSync('HOTSPOTS', updatedHotspots, async () => {
        try {
          await setDoc(doc(db, 'projects', activeProjectId, 'hotspots', hotspot.id), sanitizeForFirestore(hotspot));
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/hotspots/${hotspot.id}`);
        }
      });
    }

    if (item) {
      const updatedItems = [...scheduleItems, item];
      saveStateAndSync('ITEMS', updatedItems, async () => {
        try {
          await setDoc(doc(db, 'projects', activeProjectId, 'items', item.id), sanitizeForFirestore(item));
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `projects/${activeProjectId}/items/${item.id}`);
        }
      });
    }

    // Mark log as restored
    const updatedLogs = historyLogs.map(l => 
      l.id === log.id ? { ...l, actionType: 'restore' as const } : l
    );
    saveStateAndSync('LOGS', updatedLogs, async () => {
      try {
        await setDoc(doc(db, 'logs', log.id), sanitizeForFirestore({ ...log, actionType: 'restore' }));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `logs/${log.id}`);
      }
    });

    addLogEntry('restore', 'item', `還原了先前刪除之排程項目「${item?.name || hotspot?.name}」`);
  };

  // --- Options Custom Library Actions ---
  const handleSaveOptions = (type: 'departments' | 'owners' | 'vendors' | 'statuses' | 'designers', updatedList: string[]) => {
    let payload = { departments, owners, vendors, statuses, designers };
    if (type === 'departments') {
      payload.departments = updatedList;
    } else if (type === 'owners') {
      payload.owners = updatedList;
    } else if (type === 'vendors') {
      payload.vendors = updatedList;
    } else if (type === 'statuses') {
      payload.statuses = updatedList;
    } else {
      payload.designers = updatedList;
    }

    saveStateAndSync('OPTIONS', payload, async () => {
      try {
        await setDoc(doc(db, 'options', 'library'), sanitizeForFirestore(payload));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'options/library');
      }
    });

    const label = type === 'departments' 
      ? '設計單位' 
      : type === 'designers'
      ? '設計師'
      : type === 'owners' 
      ? '負責人' 
      : type === 'vendors' 
      ? '廠商' 
      : '狀態';
    addLogEntry('update', 'option', `更新了「${label}」的選單項目庫`);
  };

  // --- Contact Card Modal Management Actions ---
  const handleOpenContactModal = (contactId: string | null, onAssociatedItemId?: string) => {
    if (onAssociatedItemId) {
      setAssociatedItemId(onAssociatedItemId);
    } else {
      setAssociatedItemId(null);
    }

    if (contactId) {
      const found = contacts.find(c => c.id === contactId);
      if (found) {
        setActiveContact(found);
      }
    } else {
      // Initialize an empty layout card
      setActiveContact({
        id: 'contact_' + generateUUID(),
        name: '',
        companyPhone: '',
        mobile: '',
        lineId: ''
      });
    }
    setIsContactModalOpen(true);
  };

  const handleSaveContact = (updatedContact: Contact) => {
    const isNew = !contacts.some(c => c.id === updatedContact.id);
    const updatedContacts = isNew 
      ? [...contacts, updatedContact]
      : contacts.map(c => c.id === updatedContact.id ? updatedContact : c);

    saveStateAndSync('CONTACTS', updatedContacts, async () => {
      try {
        await setDoc(doc(db, 'contacts', updatedContact.id), sanitizeForFirestore(updatedContact));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `contacts/${updatedContact.id}`);
      }
    });

    // If this contact was created dynamically from a specific row item, link them!
    if (isNew && associatedItemId) {
      handleUpdateScheduleItem(associatedItemId, 'contactId', updatedContact.id);
      setAssociatedItemId(null);
    }

    addLogEntry(
      isNew ? 'create' : 'update',
      'contact',
      `${isNew ? '新增' : '更新'}了廠商聯絡人「${updatedContact.name}」的名片資料`
    );
  };

  // --- Export / Download PDF / Excel ---
  const handleExportData = () => {
    handleExportExcel();
  };

  const handleExportExcel = () => {
    // Generate clean CSV for active project's schedule
    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeItems = scheduleItems.filter(i => i.projectId === activeProjectId);
    
    let csvContent = "\uFEFF"; // UTF-8 BOM to prevent excel Chinese gibberish
    csvContent += "編號,項目名稱,負責人,設計單位,設計師,負責廠商,廠商窗口,進度狀態,對稿截止日期,預計完成日期,完工狀態,備註,附件名稱\n";

    activeItems.forEach(item => {
      const contactObj = contacts.find(c => c.id === item.contactId);
      const contactName = contactObj ? contactObj.name : "無";
      const statusText = item.isCompleted ? "已完工" : "進行中";
      
      const line = [
        item.code || "手動無",
        `"${item.name.replace(/"/g, '""')}"`,
        item.owner || "未指定",
        item.department || "未指定",
        item.designer || "未指定",
        item.vendor || "未指定",
        contactName,
        item.status || "未指定",
        item.proofDeadline,
        item.completionDate,
        statusText,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        `"${(item.attachmentName || '').replace(/"/g, '""')}"`
      ].join(",");
      csvContent += line + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `勝宏集團70週年_${activeProject?.name || "專案排程"}_匯出明細_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    
    const originalGetComputedStyle = window.getComputedStyle;
    
    // Temporarily patch window.getComputedStyle to sanitize modern color functions (oklch/oklab/light-dark) for html2canvas
    window.getComputedStyle = function (elt, pseudoElt) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop, receiver) {
          if (prop === 'getPropertyValue') {
            return function(propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('light-dark'))) {
                return val
                  .replace(/oklch\([^)]+\)/g, 'rgb(139, 109, 83)')
                  .replace(/oklab\([^)]+\)/g, 'rgb(139, 109, 83)')
                  .replace(/light-dark\(([^,]+),\s*([^)]+)\)/g, '$1');
              }
              return val;
            };
          }
          const val = target[prop as any] as any;
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('light-dark'))) {
            return val
              .replace(/oklch\([^)]+\)/g, 'rgb(139, 109, 83)')
              .replace(/oklab\([^)]+\)/g, 'rgb(139, 109, 83)')
              .replace(/light-dark\(([^,]+),\s*([^)]+)\)/g, '$1');
          }
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      });
    };

    // Helper to sanitize styles for html2canvas, bypassing oklab/oklch parser bugs in external styles
    const tempStyleElements: HTMLStyleElement[] = [];
    const disabledOriginalSheets: { sheet: CSSStyleSheet; disabled: boolean }[] = [];
    
    try {
      try {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;

            let cssText = '';
            for (let i = 0; i < rules.length; i++) {
              cssText += rules[i].cssText + '\n';
            }

            if (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('light-dark')) {
              const sanitizedCss = cssText
                .replace(/oklch\([^)]+\)/g, 'rgba(100, 100, 100, 0.5)')
                .replace(/oklab\([^)]+\)/g, 'rgba(100, 100, 100, 0.5)')
                .replace(/light-dark\([^,]+,\s*([^)]+)\)/g, '$1');

              const tempStyle = document.createElement('style');
              tempStyle.setAttribute('data-temp-pdf-safe', 'true');
              tempStyle.textContent = sanitizedCss;
              document.head.appendChild(tempStyle);
              tempStyleElements.push(tempStyle);

              disabledOriginalSheets.push({ sheet: sheet as CSSStyleSheet, disabled: sheet.disabled });
              sheet.disabled = true;
            }
          } catch (sheetErr) {
            // Ignore security issues on cross-origin stylesheets
          }
        }
      } catch (styleErr) {
        console.warn('Failed style sanitization step:', styleErr);
      }

      const activeProject = projects.find(p => p.id === activeProjectId);
      const docName = activeProject?.name.replace('🎉 ', '') || '專案';
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      let pageCount = 0;

      const addSectionToPdf = async (elementId: string, title: string) => {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (pageCount > 0) {
          pdf.addPage();
        }
        pageCount++;

        // Render elegant header title block
        pdf.setFillColor(250, 249, 246); // background matching light theme #FAF9F6
        pdf.rect(0, 0, pdfWidth, 24, 'F');
        
        pdf.setDrawColor(108, 112, 114); // #6c7072 line
        pdf.setLineWidth(0.5);
        pdf.line(0, 24, pdfWidth, 24);

        // Add elegant text headers
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 113, 108); // text-main/50
        pdf.text('SHENG HONG GROUP 70TH ANNIVERSARY PROJECT REPORT', 15, 10);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(139, 109, 83); // wood-dark color
        pdf.text(`[${docName}] ${title}`, 15, 18);

        // Capture element
        const canvas = await html2canvas(el, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const margin = 12;
        const availableWidth = pdfWidth - (margin * 2);
        const availableHeight = pdfHeight - 38; // space below the top banner

        const imgWidth = availableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > availableHeight) {
          // Fit it perfectly
          const scale = availableHeight / imgHeight;
          const fittedWidth = imgWidth * scale;
          const fittedHeight = imgHeight * scale;
          const offsetLeft = margin + (availableWidth - fittedWidth) / 2;
          pdf.addImage(imgData, 'JPEG', offsetLeft, 28, fittedWidth, fittedHeight);
        } else {
          pdf.addImage(imgData, 'JPEG', margin, 28, imgWidth, imgHeight);
        }

        // Add page numbering footer
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${pageCount}`, pdfWidth - 25, pdfHeight - 10);
        pdf.text('Generated via Sheng Hong Collaborative Work System', 15, pdfHeight - 10);
      };

      // 1. Add Diagram page (if this is not a pure checklist project)
      if (activeProject?.templateType !== 'checklist') {
        await addSectionToPdf('image-hotspot-mapper-card', '設計示意圖與互動標註點');
      }

      // 2. Add Schedule Grid page (includes filter, table, and Gantt Chart!)
      await addSectionToPdf('schedule-grid-root', '專案時序甘特圖與排程檢核明細');

      // Save the generated document
      pdf.save(`勝宏集團70週年_${docName}_專案報表_${new Date().toISOString().slice(0, 10)}.pdf`);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('產生 PDF 報表時發生錯誤，請重試！');
    } finally {
      // Restore getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

      // Restore styles
      try {
        tempStyleElements.forEach(el => el.remove());
        disabledOriginalSheets.forEach(item => {
          item.sheet.disabled = item.disabled;
        });
      } catch (restoreErr) {
        console.warn('Failed to restore styles:', restoreErr);
      }
      setIsExportingPDF(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      projects: localStorage.getItem('sh_projects'),
      hotspots: localStorage.getItem('sh_hotspots'),
      contacts: localStorage.getItem('sh_contacts'),
      items: localStorage.getItem('sh_items'),
      departments: localStorage.getItem('sh_departments'),
      owners: localStorage.getItem('sh_owners'),
      vendors: localStorage.getItem('sh_vendors'),
      statuses: localStorage.getItem('sh_statuses'),
      designers: localStorage.getItem('sh_designers'),
      logs: localStorage.getItem('sh_logs'),
      user_units: localStorage.getItem('sh_user_units')
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `勝宏集團70週年_全站排程備份_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data) {
          if (data.projects) {
            localStorage.setItem('sh_projects', data.projects);
            setProjects(JSON.parse(data.projects));
          }
          if (data.hotspots) {
            localStorage.setItem('sh_hotspots', data.hotspots);
            setHotspots(JSON.parse(data.hotspots));
          }
          if (data.contacts) {
            localStorage.setItem('sh_contacts', data.contacts);
            setContacts(JSON.parse(data.contacts));
          }
          if (data.items) {
            localStorage.setItem('sh_items', data.items);
            setScheduleItems(JSON.parse(data.items));
          }
          if (data.departments) {
            localStorage.setItem('sh_departments', data.departments);
            setDepartments(JSON.parse(data.departments));
          }
          if (data.owners) {
            localStorage.setItem('sh_owners', data.owners);
            setOwners(JSON.parse(data.owners));
          }
          if (data.vendors) {
            localStorage.setItem('sh_vendors', data.vendors);
            setVendors(JSON.parse(data.vendors));
          }
          if (data.statuses) {
            localStorage.setItem('sh_statuses', data.statuses);
            setStatuses(JSON.parse(data.statuses));
          }
          if (data.designers) {
            localStorage.setItem('sh_designers', data.designers);
            setDesigners(JSON.parse(data.designers));
          }
          if (data.logs) {
            localStorage.setItem('sh_logs', data.logs);
            setHistoryLogs(JSON.parse(data.logs));
          }
          if (data.user_units) {
            localStorage.setItem('sh_user_units', data.user_units);
            setUserUnits(JSON.parse(data.user_units));
          }
          
          alert('🎉 資料備份還原成功！全站所有專案、圖面標註、排程工作及名片資料已完全恢復！');
          window.location.reload();
        }
      } catch (err) {
        alert('❌ 匯入失敗，請確認上傳的檔案是正確的排程備份 JSON 檔案。');
      }
    };
    reader.readAsText(file);
  };

  // --- Active filtered project lists ---
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const activeHotspots = hotspots.filter(h => h.projectId === activeProjectId);
  const activeItems = scheduleItems.filter(i => i.projectId === activeProjectId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-[#5E8075]/20 selection:text-[#1E3F35]">
      {/* 1. Header Navigation Bar */}
      <HeaderBanner
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => setActiveProjectId(id)}
        onAddProject={handleAddProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        isFirebaseSynced={isFirebaseConnected}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onExport={handleExportData}
        currentUserUnit={currentUserUnit}
        onSetUserUnit={setCurrentUserUnit}
        userUnits={userUnits}
        onUpdateUserUnits={setUserUnits}
        historyLogs={historyLogs}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* 2. Main Collaborative Stage Workspace */}
      {activeProject ? (
        <main className="flex-1 max-w-[1600px] xl:max-w-none w-full mx-auto p-4 md:p-6 xl:px-12 space-y-6">
          
          {/* Upper Section: Layout Split */}
          {activeProject.templateType === 'checklist' ? (
            <div className="bg-white rounded-xl border border-line shadow-2xs p-5 font-sans flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] bg-seesaw-green-light text-wood-dark border border-wood-light/20 px-2.5 py-0.5 rounded font-bold tracking-widest uppercase">
                  📋 純排程明細表版型
                </span>
                <h3 className="font-bold text-base text-wood-dark mt-2">🎉 {activeProject.name.replace('🎉 ', '')} • 專案排程表</h3>
                <p className="text-xs text-stone-500 mt-1">
                  此專案無圖面示意，所有排程工作項目直接在下方表格中維護與管理。
                </p>
              </div>
              
              {/* Progress Summary Card */}
              <div className="flex items-center gap-5 min-w-[320px] bg-stone-50 border border-line p-3 rounded-lg">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-500">工作完成率</span>
                    <span className="font-mono font-bold text-seesaw-orange">
                      {activeItems.length > 0 
                        ? Math.round((activeItems.filter(i => i.isCompleted).length / activeItems.length) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-seesaw-yellow rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-seesaw-orange transition-all duration-500"
                      style={{ 
                        width: `${activeItems.length > 0 
                          ? (activeItems.filter(i => i.isCompleted).length / activeItems.length) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="text-right text-[11px] text-stone-500 whitespace-nowrap border-l border-stone-200 pl-4">
                  <div>總工作：<b>{activeItems.length}</b></div>
                  <div>已完成：<span className="text-wood-light font-bold">{activeItems.filter(i => i.isCompleted).length}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Column A: Interactive Hotspot Map (7 cols) */}
              <div className="lg:col-span-8">
                <ImageHotspotMapper
                  hotspots={activeHotspots}
                  projectImageSrc={activeProject.imageSrc}
                  projectId={activeProject.id}
                  diagramName={activeProject.diagramName || '勝宏禮盒外觀立體示意圖'}
                  onUpdateDiagramName={(newName) => handleUpdateProjectDiagramName(activeProject.id, newName)}
                  onAddHotspot={handleAddHotspot}
                  onEditHotspot={handleEditHotspot}
                  onDeleteHotspot={handleDeleteHotspot}
                  onMoveHotspot={handleMoveHotspot}
                  onUpdateImage={handleUpdateProjectImage}
                />
              </div>

              {/* Column B: Executive Summary & Project Stats Widget (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-line shadow-2xs p-5 font-sans space-y-5">
                <div className="border-b border-line pb-3">
                  <span className="text-[10px] bg-seesaw-green-light text-wood-dark border border-wood-light/20 px-2.5 py-0.5 rounded font-bold tracking-widest uppercase">勝宏 70週年重要提示</span>
                  <h3 className="font-bold text-sm text-wood-dark mt-2">進度決策與跨部門協作</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    此系統主要用於協調 70週年禮盒的<b>企劃、勝陽、廠務課</b>進度對稿。請隨時確保截止日期與廠商完成時間對齊，以利集團大會如期舉行。
                  </p>
                </div>

                {/* Progress Bar Widget */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-500">專案總體驗收進度</span>
                    <span className="font-mono font-bold text-seesaw-orange">
                      {activeItems.length > 0 
                        ? Math.round((activeItems.filter(i => i.isCompleted).length / activeItems.length) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-seesaw-yellow rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-seesaw-orange transition-all duration-500"
                      style={{ 
                        width: `${activeItems.length > 0 
                          ? (activeItems.filter(i => i.isCompleted).length / activeItems.length) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">
                    目前已交付 {activeItems.filter(i => i.isCompleted).length} / {activeItems.length} 項結構及包裝。
                  </p>
                </div>

                {/* Quick instructions details list */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-wood-dark block text-[11px]">💡 作業指導口訣：</span>
                  <ul className="list-decimal list-inside space-y-1 text-stone-600">
                    <li>先點擊<b>上方示意圖</b>新增對應結構的「專屬編號 (如 A1)」。</li>
                    <li>下方表格會自動連動，即可填寫<b>負責人、截止日期</b>。</li>
                    <li>完成時勾選最左側核取方塊，表格資訊自動淡化。</li>
                    <li>點擊<b>右上角「變更歷程」</b>，可一鍵恢復誤刪的項目。</li>
                  </ul>
                </div>

                {/* Wood tone footer signature seal */}
                <div className="pt-3 border-t border-line/50 flex justify-between items-center text-[10px] text-stone-400">
                  <span>勝宏集團 70週年籌備小組</span>
                </div>
              </div>
            </section>
          )}

          {/* Lower Section: Dynamic Notion schedule table */}
          <section id="schedule-grid-section">
            <ScheduleGrid
              items={activeItems}
              contacts={contacts}
              departments={departments}
              owners={owners}
              designers={designers}
              vendors={vendors}
              statuses={statuses}
              onUpdateItem={handleUpdateScheduleItem}
              onDeleteItem={handleDeleteScheduleItem}
              onAddNewItem={handleAddNewManualItem}
              onOpenContactModal={handleOpenContactModal}
              onOpenOptionLibrary={(defaultTab) => {
                if (defaultTab && typeof defaultTab === 'string') {
                  setOptionModalDefaultTab(defaultTab);
                } else {
                  setOptionModalDefaultTab('owners');
                }
                setIsOptionModalOpen(true);
              }}
            />
          </section>
        </main>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
          讀取專案中，請稍候...
        </div>
      )}

      {/* 3. Global Decorative Clean Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-6 text-center text-xs text-stone-400 mt-12 print:hidden flex-shrink-0">
        <p>© 1956 - 2026 勝宏集團 Sheng Hong Group 創立七十週年版權所有。</p>
        <p className="mt-1 text-[10px] text-stone-400/80">由 70週年大會籌備工程團隊精心打造・日系匠心排程平台</p>
      </footer>

      {/* --- Modals and Overlays --- */}
      <ContactCardModal
        contact={activeContact}
        isOpen={isContactModalOpen}
        onClose={() => { setIsContactModalOpen(false); setActiveContact(null); }}
        onSave={handleSaveContact}
      />

      <OptionLibraryModal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        departments={departments}
        owners={owners}
        vendors={vendors}
        statuses={statuses}
        designers={designers}
        defaultActiveTab={optionModalDefaultTab}
        onSaveOptions={handleSaveOptions}
      />

      <AuditHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        logs={historyLogs.filter(log => log.projectId === activeProjectId)}
        onRestoreItem={handleRestoreItem}
      />

      {/* Project Deletion Confirmation Dialog */}
      {projectToDeleteId && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="font-bold text-base text-stone-900">確認刪除專案？</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                您即將刪除專案「<span className="font-bold text-stone-900">{projects.find(p => p.id === projectToDeleteId)?.name}</span>」。
                刪除後將會同步移除此專案下的所有標註標記、排程工作與進度表，此動作無法撤銷！
              </p>
            </div>
            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setProjectToDeleteId(null)}
                className="px-4 py-2 bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
              >
                確認永久刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {customAlert && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-sm w-full overflow-hidden text-stone-900 font-sans">
            <div className="p-6">
              <div className="flex items-center gap-2.5 text-amber-600 mb-3">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-sm text-stone-900">提醒資訊</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {customAlert}
              </p>
            </div>
            <div className="bg-stone-50 px-6 py-3 flex justify-end border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCustomAlert(null)}
                className="px-4 py-1.5 bg-wood-dark hover:bg-wood-dark/95 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
