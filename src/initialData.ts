import { Project, Hotspot, Contact, ScheduleItem, OptionLibrary } from './types';

export const DEFAULT_DEPARTMENTS = ['企劃部', '勝陽', '廠務課', '行銷部'];
export const DEFAULT_OWNERS = ['林小明', '王大同', '陳美玲', '張立成', '徐若瑄'];
export const DEFAULT_DESIGNERS = ['王小二', '張小三', '林設計', '劉專員'];
export const DEFAULT_VENDORS = ['美好印刷', '包裝行', '宏達包材', '萬家香食品', '勝宏集團總務部'];
export const DEFAULT_STATUSES = ['設計中', '打樣中', '校對中', '待確認', '量產中', '已交付'];

export const DEFAULT_CONTACTS: Contact[] = [
  {
    id: 'contact_1',
    name: '陳經理',
    companyPhone: '02-2789-5566',
    mobile: '0912-345-678',
    lineId: 'manager_chen'
  },
  {
    id: 'contact_2',
    name: '李專員',
    companyPhone: '04-2345-6789',
    mobile: '0923-456-789',
    lineId: 'spe_li'
  },
  {
    id: 'contact_3',
    name: '黃副理',
    companyPhone: '03-3456-7890',
    mobile: '0934-567-890',
    lineId: 'vp_huang'
  },
  {
    id: 'contact_4',
    name: '林秘書',
    companyPhone: '07-555-8888',
    mobile: '0945-678-901',
    lineId: 'sec_lin'
  }
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'project_70th_box',
    name: '勝宏 70週年禮盒',
    imageSrc: '', // Will be resolved dynamically to our generated image or fallback SVG
    createdAt: 1783042541676
  }
];

export const DEFAULT_HOTSPOTS: Hotspot[] = [
  {
    id: 'hotspot_a1',
    projectId: 'project_70th_box',
    code: 'A1',
    name: '禮盒外蓋 (紙盒大身)',
    x: 32.5,
    y: 28.2
  },
  {
    id: 'hotspot_b1',
    projectId: 'project_70th_box',
    code: 'B1',
    name: '手工餅乾內層鋁箔包裝',
    x: 48.0,
    y: 45.5
  },
  {
    id: 'hotspot_c1',
    projectId: 'project_70th_box',
    code: 'C1',
    name: '70週年燙金紀念封口貼紙',
    x: 64.2,
    y: 31.8
  },
  {
    id: 'hotspot_d1',
    projectId: 'project_70th_box',
    code: 'D1',
    name: '中秋蛋黃酥吸塑底托盒',
    x: 78.5,
    y: 62.0
  }
];

export const DEFAULT_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'item_1',
    projectId: 'project_70th_box',
    hotspotId: 'hotspot_a1',
    code: 'A1',
    name: '禮盒外蓋 (紙盒大身)',
    department: '企劃部',
    owner: '林小明',
    vendor: '美好印刷',
    contactId: 'contact_1',
    proofDeadline: '2026-07-15',
    completionDate: '2026-07-25',
    isCompleted: false
  },
  {
    id: 'item_2',
    projectId: 'project_70th_box',
    hotspotId: 'hotspot_b1',
    code: 'B1',
    name: '手工餅乾內層鋁箔包裝',
    department: '廠務課',
    owner: '王大同',
    vendor: '包裝行',
    contactId: 'contact_2',
    proofDeadline: '2026-07-18',
    completionDate: '2026-07-28',
    isCompleted: true
  },
  {
    id: 'item_3',
    projectId: 'project_70th_box',
    hotspotId: 'hotspot_c1',
    code: 'C1',
    name: '70週年燙金紀念封口貼紙',
    department: '企劃部',
    owner: '陳美玲',
    vendor: '宏達包材',
    contactId: 'contact_3',
    proofDeadline: '2026-07-20',
    completionDate: '2026-07-30',
    isCompleted: false
  },
  {
    id: 'item_4',
    projectId: 'project_70th_box',
    hotspotId: 'hotspot_d1',
    code: 'D1',
    name: '中秋蛋黃酥吸塑底托盒',
    department: '勝陽',
    owner: '張立成',
    vendor: '萬家香食品',
    contactId: 'contact_4',
    proofDeadline: '2026-07-22',
    completionDate: '2026-08-05',
    isCompleted: false
  },
  {
    id: 'item_5',
    projectId: 'project_70th_box',
    hotspotId: null,
    code: '',
    name: '70週年禮盒物流配送合約簽訂',
    department: '企劃部',
    owner: '徐若瑄',
    vendor: '勝宏集團總務部',
    contactId: 'contact_4',
    proofDeadline: '2026-07-10',
    completionDate: '2026-07-15',
    isCompleted: false
  }
];
