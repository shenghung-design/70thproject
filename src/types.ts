export interface Project {
  id: string;
  name: string;
  imageSrc: string;
  createdAt: number;
  templateType?: 'diagram' | 'checklist'; // 'diagram' (with schematic) or 'checklist' (only table/schedule list)
  diagramName?: string;
}

export interface Hotspot {
  id: string;
  projectId: string;
  code: string; // e.g., "A1"
  name: string; // e.g., "外盒包裝"
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface Contact {
  id: string;
  name: string;
  companyPhone: string;
  mobile: string;
  lineId: string;
}

export interface ScheduleItem {
  id: string;
  projectId: string;
  hotspotId: string | null; // linked hotspot, if any
  code: string; // e.g., "A1" (or empty for independent items)
  name: string;
  department: string; // e.g., "企劃部"
  owner: string; // e.g., "林小明"
  vendor: string; // e.g., "美好印刷"
  contactId: string | null; // linked contact ID
  proofDeadline: string; // YYYY-MM-DD
  completionDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  status?: string; // custom progress status (e.g., "設計中", "打樣中", "量產中")
  notes?: string; // custom remarks/notes
  attachmentName?: string; // name of the uploaded attachment file
  attachmentUrl?: string; // data URL or link to the attachment
  designer?: string; // e.g., "王小二"
}

export interface OptionLibrary {
  departments: string[];
  owners: string[];
  vendors: string[];
  statuses: string[];
  designers?: string[];
}

export interface HistoryLog {
  id: string;
  projectId: string;
  timestamp: number;
  userName: string;
  actionType: 'create' | 'update' | 'delete' | 'restore';
  entityType: 'project' | 'hotspot' | 'item' | 'option' | 'contact';
  description: string;
  details?: any; // To store full item data for restore capability
}
