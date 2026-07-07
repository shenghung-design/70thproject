import React, { useState } from 'react';
import { ScheduleItem, Contact } from '../types';
import { User, Calendar as CalendarIcon, Trash2, CheckCircle2, Circle, AlertCircle, Plus, ChevronLeft, ChevronRight, Check, ArrowUp, ArrowDown, ArrowUpDown, BarChart2, Paperclip, X, MessageSquare, Clock, Eye, Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScheduleGridProps {
  items: ScheduleItem[];
  contacts: Contact[];
  departments: string[];
  owners: string[];
  designers?: string[];
  vendors: string[];
  statuses: string[];
  onUpdateItem: (itemId: string, field: keyof ScheduleItem | Partial<ScheduleItem>, value?: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddNewItem: () => void;
  onOpenContactModal: (contactId: string | null, onAssociatedItemId?: string) => void;
  onOpenOptionLibrary: (defaultTab?: 'departments' | 'owners' | 'vendors' | 'statuses' | 'designers') => void;
}

export default function ScheduleGrid({
  items,
  contacts,
  departments,
  owners,
  designers = [],
  vendors,
  statuses,
  onUpdateItem,
  onDeleteItem,
  onAddNewItem,
  onOpenContactModal,
  onOpenOptionLibrary
}: ScheduleGridProps) {

  // Check if proof deadline is less than 3 days away (or overdue)
  const isUrgent = (deadlineStr: string, isCompleted: boolean) => {
    if (isCompleted || !deadlineStr) return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(deadlineStr);
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 3; // within 3 days or already overdue
    } catch (e) {
      return false;
    }
  };

  // Determine beautiful colors for different statuses
  const getStatusBadgeClass = (status: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-stone-100 text-stone-400 border-stone-200';
    switch (status) {
      case '設計中':
        return 'bg-blue-50 text-blue-700 border-blue-200 focus:border-blue-400';
      case '打樣中':
        return 'bg-purple-50 text-purple-700 border-purple-200 focus:border-purple-400';
      case '校對中':
        return 'bg-amber-50 text-amber-700 border-amber-200 focus:border-amber-400';
      case '待確認':
        return 'bg-rose-50 text-rose-700 border-rose-200 focus:border-rose-400';
      case '量產中':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 focus:border-indigo-400';
      case '已交付':
        return 'bg-green-50 text-green-700 border-green-200 focus:border-green-400';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200 focus:border-wood-dark';
    }
  };

  // View switch states: 'table' | 'calendar'
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Sort State for Proof Deadline: 'none' | 'asc' | 'desc'
  const [deadlineSort, setDeadlineSort] = useState<'none' | 'asc' | 'desc'>('none');
  
  // Sort State for Expected Completion Date: 'none' | 'asc' | 'desc'
  const [completionSort, setCompletionSort] = useState<'none' | 'asc' | 'desc'>('none');
  
  // Calendar sub-states: 'month' | 'week'
  const [calendarType, setCalendarType] = useState<'month' | 'week'>('month');
  const [calendarCenterDate, setCalendarCenterDate] = useState<Date>(new Date());

  // Column Filters States
  const [filterOwner, setFilterOwner] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDesigner, setFilterDesigner] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Sticky window freeze state for Item Name column
  const [isFrozen, setIsFrozen] = useState<boolean>(true);

  // Row Inline Safe Deletion State (No blocking iframe confirm dialogues)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Selected Gantt Item for detail popup modal
  const [selectedGanttItem, setSelectedGanttItem] = useState<ScheduleItem | null>(null);

  // New Comment/Message State in the Gantt Detail Modal
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');

  // Attachment Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string } | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const getContactName = (contactId: string | null) => {
    if (!contactId) return null;
    const found = contacts.find(c => c.id === contactId);
    return found ? found.name : null;
  };

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  // 1. First, filter items based on selected filters
  const filteredItems = items.filter(item => {
    if (filterOwner && item.owner !== filterOwner) return false;
    if (filterDept && item.department !== filterDept) return false;
    if (filterDesigner && (item.designer || '') !== filterDesigner) return false;
    if (filterVendor && item.vendor !== filterVendor) return false;
    if (filterStatus && (item.status || '') !== filterStatus) return false;
    return true;
  });

  const handleSortDeadline = () => {
    setCompletionSort('none');
    setDeadlineSort(prev => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  const handleSortCompletion = () => {
    setDeadlineSort('none');
    setCompletionSort(prev => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  // 2. Sort filtered items: Active first, completed items pushed to the bottom
  const sortedItems = [...filteredItems].sort((a, b) => {
    // 1. Completion status grouping (active tasks first)
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;

    // 2. Deadline sorting (if active)
    if (deadlineSort !== 'none') {
      const hasA = !!a.proofDeadline;
      const hasB = !!b.proofDeadline;
      if (!hasA && hasB) return 1; // push no-deadline to bottom
      if (hasA && !hasB) return -1; // push no-deadline to bottom
      if (!hasA && !hasB) return 0; // maintain relative order

      const dateA = new Date(a.proofDeadline).getTime();
      const dateB = new Date(b.proofDeadline).getTime();

      if (deadlineSort === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    }

    // 3. Completion date sorting (if active)
    if (completionSort !== 'none') {
      const hasA = !!a.completionDate;
      const hasB = !!b.completionDate;
      if (!hasA && hasB) return 1; // push no-date to bottom
      if (hasA && !hasB) return -1; // push no-date to bottom
      if (!hasA && !hasB) return 0; // maintain relative order

      const dateA = new Date(a.completionDate).getTime();
      const dateB = new Date(b.completionDate).getTime();

      if (completionSort === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    }

    return 0; // maintain relative order
  });

  // --- Gantt Chart Data Preparation ---
  
  // Define color mapping for departments/vendors
  const getEntityColor = (name: string) => {
    const colors = [
      { bg: 'bg-amber-200', text: 'text-amber-800' },
      { bg: 'bg-emerald-200', text: 'text-emerald-800' },
      { bg: 'bg-indigo-200', text: 'text-indigo-800' },
      { bg: 'bg-rose-200', text: 'text-rose-800' },
      { bg: 'bg-sky-200', text: 'text-sky-800' },
      { bg: 'bg-purple-200', text: 'text-purple-800' },
      { bg: 'bg-teal-200', text: 'text-teal-800' },
      { bg: 'bg-orange-200', text: 'text-orange-800' },
      { bg: 'bg-blue-200', text: 'text-blue-800' },
      { bg: 'bg-green-200', text: 'text-green-800' },
      { bg: 'bg-yellow-200', text: 'text-yellow-800' },
      { bg: 'bg-red-200', text: 'text-red-800' },
      { bg: 'bg-cyan-200', text: 'text-cyan-800' },
      { bg: 'bg-fuchsia-200', text: 'text-fuchsia-800' },
      { bg: 'bg-violet-200', text: 'text-violet-800' },
      { bg: 'bg-pink-200', text: 'text-pink-800' },
      { bg: 'bg-slate-200', text: 'text-slate-800' },
      { bg: 'bg-zinc-200', text: 'text-zinc-800' },
      { bg: 'bg-stone-200', text: 'text-stone-800' },
      { bg: 'bg-lime-200', text: 'text-lime-800' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const ganttData = items
    .filter(item => item.proofDeadline || item.completionDate)
    .map(item => {
      const startStr = item.proofDeadline || item.completionDate || '';
      const endStr = item.completionDate || item.proofDeadline || '';
      
      const start = new Date(startStr);
      const end = new Date(endStr);
      
      const startTime = isNaN(start.getTime()) ? Date.now() : start.getTime();
      const endTime = isNaN(end.getTime()) ? Date.now() : end.getTime();
      
      const finalStart = Math.min(startTime, endTime);
      const finalEnd = Math.max(startTime, endTime);
      
      const durationDays = Math.ceil((finalEnd - finalStart) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: item.id,
        name: item.name,
        code: item.code || '手動',
        startStr: startStr,
        endStr: endStr,
        startValue: finalStart,
        endValue: finalEnd,
        duration: durationDays,
        range: [finalStart, finalEnd],
        isCompleted: item.isCompleted,
        owner: item.owner || '無',
        department: item.department || '無',
        vendor: item.vendor || '無',
        color: getEntityColor(item.department || item.vendor || '無')
      };
    })
    .sort((a, b) => a.startValue - b.startValue);

  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // --- Calendar Navigation Helpers ---
  const handlePrevPeriod = () => {
    const next = new Date(calendarCenterDate);
    if (calendarType === 'month') {
      next.setMonth(calendarCenterDate.getMonth() - 1);
    } else {
      next.setDate(calendarCenterDate.getDate() - 7);
    }
    setCalendarCenterDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(calendarCenterDate);
    if (calendarType === 'month') {
      next.setMonth(calendarCenterDate.getMonth() + 1);
    } else {
      next.setDate(calendarCenterDate.getDate() + 7);
    }
    setCalendarCenterDate(next);
  };

  const handleTodayPeriod = () => {
    setCalendarCenterDate(new Date());
  };

  // --- Generate Calendar Cells ---
  const generateMonthCells = () => {
    const year = calendarCenterDate.getFullYear();
    const month = calendarCenterDate.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 6 = Sat
    
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Pad previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        dateStr: formatDateString(d)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrentMonth: true,
        dateStr: formatDateString(d)
      });
    }

    // Pad next month days to align with a 6-row standard calendar (42 cells)
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        dateStr: formatDateString(d)
      });
    }

    return cells;
  };

  const generateWeekCells = () => {
    const day = calendarCenterDate.getDay(); // 0 = Sun
    const startOfWeek = new Date(calendarCenterDate);
    startOfWeek.setDate(calendarCenterDate.getDate() - day);

    const cells: { date: Date; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      cells.push({
        date: d,
        dateStr: formatDateString(d)
      });
    }
    return cells;
  };

  // Find all schedule operations on a specific day
  const getDeadlinesForDate = (dateStr: string) => {
    return items.filter(item => item.proofDeadline === dateStr || item.completionDate === dateStr);
  };

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const weekdayNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  return (
    <div id="schedule-grid-root" className="font-sans text-text-main space-y-6">
      <div className="border rounded-xl shadow-md overflow-hidden bg-white flex flex-col" style={{ borderColor: '#6c7072' }}>
        {/* 1. Header Control Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f8f0da] px-6 py-4 border-b" style={{ borderColor: '#6c7072' }}>
        <div>
          <h3 className="text-base font-bold text-text-main font-serif tracking-wide border-l-4 border-wood-light pl-3 flex items-center gap-2">
            <span>排程明細表檢核</span>
            {viewMode === 'calendar' && (
              <span className="text-xs bg-wood-light/20 text-wood-dark px-2 py-0.5 rounded font-sans font-bold">行事曆</span>
            )}
          </h3>
          <p className="text-xs text-text-main/70 mt-1">
            {viewMode === 'table' 
              ? '所有變更將自動即時發佈。勾選「完工」後項目將自動下沉至底部，降低視覺干擾。' 
              : '可切換月表及週表。顯示各項目對稿截止日期及預計完成日期。'}
          </p>
        </div>

        {/* View Mode Switching Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main View Mode Toggle */}
          <div className="flex rounded-lg border border-line bg-stone-100 p-1 text-xs gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-wood-dark text-white shadow-xs font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>📋 列表模式</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'calendar' 
                  ? 'bg-wood-dark text-white shadow-xs font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>📅 行事曆模式</span>
            </button>
          </div>

          <button
            id="manage-option-library-btn"
            onClick={() => onOpenOptionLibrary()}
            className="px-3 py-1.5 rounded-lg border border-wood-light text-xs font-semibold text-[#8B6D53] hover:bg-[#C4A47C]/10 transition-colors cursor-pointer shadow-2xs bg-white"
          >
            ✎ 編輯選項
          </button>
          
          <button
            id="add-schedule-row-btn"
            onClick={onAddNewItem}
            className="px-3 py-1.5 rounded-lg bg-wood-dark hover:bg-wood-dark/95 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            新增項目
          </button>
        </div>
      </div>

      {/* 2. TABLE VIEW MODE */}
      {viewMode === 'table' && (
        <>
          {/* Multi-Column Filter Bar */}
          <div className="bg-stone-50 px-6 py-2.5 flex flex-wrap items-center gap-4 text-xs border-b" style={{ borderColor: '#c6cbcd' }}>
            <span className="font-bold text-[#8B6D53] flex items-center gap-1">
              <span>🔍</span>
              <span>進度篩選過濾：</span>
            </span>
            
            {/* Owner Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">負責人:</span>
              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="bg-white border border-line rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-wood-dark font-medium"
              >
                <option value="">全部 ({owners.length})</option>
                {owners.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">設計單位:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-white border border-line rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-wood-dark font-medium"
              >
                <option value="">全部 ({departments.length})</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Designer Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">設計師:</span>
              <select
                value={filterDesigner}
                onChange={(e) => setFilterDesigner(e.target.value)}
                className="bg-white border border-line rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-wood-dark font-medium"
              >
                <option value="">全部 ({designers.length})</option>
                {designers.map(ds => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
              </select>
            </div>

            {/* Vendor Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">負責廠商:</span>
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="bg-white border border-line rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-wood-dark font-medium"
              >
                <option value="">全部 ({vendors.length})</option>
                {vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">進度狀態:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-line rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-wood-dark font-medium"
              >
                <option value="">全部 ({statuses.length})</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Freeze Columns Toggle */}
            <div className="flex items-center gap-1.5 ml-auto">
              <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 hover:text-wood-dark select-none font-semibold">
                <input
                  type="checkbox"
                  checked={isFrozen}
                  onChange={(e) => setIsFrozen(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-stone-300 text-wood-dark focus:ring-wood-light cursor-pointer"
                />
                <span>📌 凍結項目名稱</span>
              </label>
            </div>

            {/* Clear Filters Button */}
            {(filterOwner || filterDept || filterDesigner || filterVendor || filterStatus) && (
              <button
                type="button"
                onClick={() => {
                  setFilterOwner('');
                  setFilterDept('');
                  setFilterDesigner('');
                  setFilterVendor('');
                  setFilterStatus('');
                }}
                className="text-[11px] font-bold text-[#8B6D53] hover:text-wood-dark underline decoration-dotted cursor-pointer"
              >
                清除篩選
              </button>
            )}
          </div>

          {/* Grid Table container */}
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[1800px] border-collapse text-left text-xs text-text-main">
              <thead className="bg-[#FAF9F6] text-wood-dark border-b border-line uppercase font-semibold">
                <tr>
                  <th className={`px-4 py-3 w-14 text-center ${isFrozen ? 'sticky left-0 z-20 bg-[#FAF9F6] border-r border-stone-200/60 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]' : ''}`}>完工</th>
                  <th className={`px-4 py-3 w-[280px] text-center ${isFrozen ? 'sticky left-14 z-20 bg-[#FAF9F6] border-r border-stone-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}>項目名稱 (對應圖面編號)</th>
                  <th className="px-4 py-3 w-[150px] text-center">負責人</th>
                  <th className="px-4 py-3 w-[130px] text-center">設計單位</th>
                  <th className="px-4 py-3 w-[110px] text-center">設計師</th>
                  <th className="px-4 py-3 w-[140px] text-center">負責廠商</th>
                  <th className="px-4 py-3 w-[150px] text-center">廠商窗口</th>
                  <th className="px-4 py-3 w-[150px] text-center">進度狀態</th>
                  <th 
                    className="px-4 py-3 w-[150px] cursor-pointer hover:bg-stone-200/55 transition-colors select-none group text-center"
                    onClick={handleSortDeadline}
                    title="點擊依對稿截止日排序 (無/升序/降序)"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span>對稿截止日</span>
                      {deadlineSort === 'asc' && (
                        <ArrowUp className="w-3.5 h-3.5 text-wood-dark" />
                      )}
                      {deadlineSort === 'desc' && (
                        <ArrowDown className="w-3.5 h-3.5 text-wood-dark" />
                      )}
                      {deadlineSort === 'none' && (
                        <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 opacity-30 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 w-[150px] cursor-pointer hover:bg-stone-200/55 transition-colors select-none group text-center"
                    onClick={handleSortCompletion}
                    title="點擊依預計完成日排序 (無/升序/降序)"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span>預計完成日</span>
                      {completionSort === 'asc' && (
                        <ArrowUp className="w-3.5 h-3.5 text-wood-dark" />
                      )}
                      {completionSort === 'desc' && (
                        <ArrowDown className="w-3.5 h-3.5 text-wood-dark" />
                      )}
                      {completionSort === 'none' && (
                        <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 opacity-30 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 w-[180px] text-center">備註</th>
                  <th className="px-4 py-3 w-[170px] text-center">上傳附件</th>
                  <th className="px-4 py-3 w-20 text-center">刪除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-text-main/50 text-xs font-medium">
                      {items.length === 0 
                        ? "目前此專案尚無任何排程項目。請點擊上方「新增排程項目」或於示意圖上「打點標註」！"
                        : "沒有符合篩選條件的排程項目。"}
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => {
                    const contactName = getContactName(item.contactId);
                    const hasHotspot = !!item.hotspotId;
                    const isRowUrgent = isUrgent(item.proofDeadline, item.isCompleted);
                    const cellBg = item.isCompleted 
                      ? 'bg-[#FAF9F6]' 
                      : isRowUrgent 
                        ? 'bg-[#fef2f2]' 
                        : 'bg-white';

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors hover:bg-bg-paper/40 ${
                          item.isCompleted 
                            ? 'bg-[#FAF9F6] text-text-main/40' 
                            : isRowUrgent
                              ? 'bg-red-50/50 text-red-900 border-l-4 border-l-red-500' 
                              : ''
                        }`}
                      >
                        {/* Status Checkbox */}
                        <td className={`px-4 py-2.5 text-center ${isFrozen ? `sticky left-0 z-10 border-r border-stone-200/60 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${cellBg}` : ''}`}>
                          <button
                            type="button"
                            id={`toggle-status-${item.id}`}
                            onClick={() => onUpdateItem(item.id, 'isCompleted', !item.isCompleted)}
                            className={`mx-auto flex items-center justify-center p-1.5 rounded-full transition-colors ${
                              item.isCompleted 
                                ? 'text-accent-green hover:text-accent-green/80 hover:bg-accent-green/10' 
                                : 'text-stone-300 hover:text-wood-dark hover:bg-bg-paper'
                            } cursor-pointer`}
                            title={item.isCompleted ? "設為未完成" : "設為完工"}
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 fill-green-50" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                        </td>

                        {/* Item Name (Editable Inline) */}
                        <td className={`px-4 py-2.5 font-medium max-w-[320px] ${isFrozen ? `sticky left-14 z-10 border-r border-stone-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${cellBg}` : ''}`}>
                          <div className="flex flex-col gap-1 justify-center">
                            <div className="flex items-center gap-2">
                              {hasHotspot ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-wood-dark text-white font-mono text-[10px] font-bold shadow-2xs flex-shrink-0">
                                  {item.code}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-wood-light/15 text-wood-dark font-sans text-[10px] font-semibold flex-shrink-0">
                                  手動項目
                                </span>
                              )}
                              {hasHotspot ? (
                                <div 
                                  className={`px-1 py-0.5 rounded text-xs font-semibold whitespace-normal break-words leading-relaxed w-full ${
                                    item.isCompleted ? 'line-through text-text-main/40' : 'text-text-main'
                                  }`}
                                  title="此項目與圖片標註點連動，請直接在圖片上點擊圓點修改名稱。"
                                >
                                  {item.name}
                                </div>
                              ) : (
                                <textarea
                                  value={item.name}
                                  onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                                  className={`bg-transparent border-b border-transparent hover:border-wood-light/50 focus:border-wood-dark focus:outline-none focus:bg-white px-1 py-0.5 rounded w-full transition-all text-xs font-semibold resize-none overflow-hidden h-auto whitespace-normal break-words leading-relaxed ${
                                    item.isCompleted ? 'line-through text-text-main/40' : 'text-text-main'
                                  }`}
                                  rows={1}
                                  placeholder="輸入項目名稱..."
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                  }}
                                />
                              )}
                            </div>
                            
                            {/* Urgent Badge */}
                            {!item.isCompleted && isRowUrgent && (
                              <div className="flex items-center gap-1 text-red-600 bg-red-100/60 px-1.5 py-0.5 rounded text-[10px] font-bold self-start mt-0.5 animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                <span>對稿截止小於 3 天 (急件)</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Owner Dropdown */}
                        <td className="px-4 py-2.5">
                          <select
                            value={item.owner}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                onOpenOptionLibrary('owners');
                              } else {
                                onUpdateItem(item.id, 'owner', e.target.value);
                              }
                            }}
                            className={`bg-stone-50 hover:bg-white focus:bg-white focus:outline-none border border-stone-200 focus:border-wood-dark px-1.5 py-1 text-xs rounded-md w-full font-medium transition-all pr-7 ${
                              item.isCompleted ? 'text-text-main/40' : 'text-text-main'
                            } cursor-pointer`}
                          >
                            <option value="">選擇負責人...</option>
                            {owners.map((owner) => (
                              <option key={owner} value={owner}>{owner}</option>
                            ))}
                            <option value="__add_new__" className="text-wood-dark font-semibold">＋ 自訂新增選項...</option>
                          </select>
                        </td>

                        {/* Department Dropdown */}
                        <td className="px-4 py-2.5">
                          <select
                            value={item.department}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                onOpenOptionLibrary('departments');
                              } else {
                                onUpdateItem(item.id, 'department', e.target.value);
                              }
                            }}
                            className={`hover:bg-white focus:bg-white focus:outline-none border border-stone-200 focus:border-wood-dark px-1.5 py-1 text-xs rounded-md w-full font-medium transition-all pr-7 ${
                              item.isCompleted ? 'text-text-main/40' : 'text-text-main'
                            } cursor-pointer ${item.department ? getEntityColor(item.department).bg.replace('bg-', 'bg-opacity-20 bg-') : 'bg-stone-50'}`}
                          >
                            <option value="">選擇設計單位...</option>
                            {departments.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                            <option value="__add_new__" className="text-wood-dark font-semibold">＋ 自訂新增選項...</option>
                          </select>
                        </td>

                        {/* Designer Dropdown */}
                        <td className="px-4 py-2.5">
                          <select
                            value={item.designer || ''}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                onOpenOptionLibrary('designers');
                              } else {
                                onUpdateItem(item.id, 'designer', e.target.value);
                              }
                            }}
                            className={`bg-stone-50 hover:bg-white focus:bg-white focus:outline-none border border-stone-200 focus:border-wood-dark px-1.5 py-1 text-xs rounded-md w-full font-medium transition-all pr-7 ${
                              item.isCompleted ? 'text-text-main/40' : 'text-text-main'
                            } cursor-pointer`}
                          >
                            <option value="">選擇設計師...</option>
                            {designers.map((designer) => (
                              <option key={designer} value={designer}>{designer}</option>
                            ))}
                            <option value="__add_new__" className="text-wood-dark font-semibold">＋ 自訂新增選項...</option>
                          </select>
                        </td>

                        {/* Vendor Dropdown */}
                        <td className="px-4 py-2.5">
                          <select
                            value={item.vendor}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                onOpenOptionLibrary('vendors');
                              } else {
                                onUpdateItem(item.id, 'vendor', e.target.value);
                              }
                            }}
                            className={`hover:bg-white focus:bg-white focus:outline-none border border-stone-200 focus:border-wood-dark px-1.5 py-1 text-xs rounded-md w-full font-medium transition-all pr-7 ${
                              item.isCompleted ? 'text-text-main/40' : 'text-text-main'
                            } cursor-pointer ${item.vendor ? getEntityColor(item.vendor).bg.replace('bg-', 'bg-opacity-20 bg-') : 'bg-stone-50'}`}
                          >
                            <option value="">選擇廠商...</option>
                            {vendors.map((vendor) => (
                              <option key={vendor} value={vendor}>{vendor}</option>
                            ))}
                            <option value="__add_new__" className="text-wood-dark font-semibold">＋ 自訂新增選項...</option>
                          </select>
                        </td>

                        {/* Vendor Contact (Interactive Modal Trigger) */}
                        <td className="px-4 py-2.5">
                          {contactName ? (
                            <button
                              type="button"
                              id={`view-contact-${item.id}`}
                              onClick={() => onOpenContactModal(item.contactId, item.id)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-left font-medium transition-all ${
                                item.isCompleted 
                                  ? 'text-text-main/40 hover:text-wood-dark' 
                                  : 'text-wood-dark hover:bg-wood-light/10'
                              } cursor-pointer underline decoration-dotted`}
                            >
                              <User className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="whitespace-normal break-words max-w-[120px]">{contactName}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              id={`add-contact-${item.id}`}
                              onClick={() => onOpenContactModal(null, item.id)}
                              className="flex items-center gap-1 text-text-main/50 hover:text-wood-dark hover:bg-bg-paper/50 px-2 py-1 rounded border border-dashed border-line transition-all text-[11px] cursor-pointer"
                            >
                              <span>＋ 設定聯絡窗口</span>
                            </button>
                          )}
                        </td>

                        {/* Customizable Status Dropdown */}
                        <td className="px-4 py-2.5">
                          <select
                            value={item.status || ''}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                onOpenOptionLibrary('statuses');
                              } else {
                                onUpdateItem(item.id, 'status', e.target.value);
                              }
                            }}
                            className={`hover:bg-white focus:bg-white focus:outline-none border px-1.5 py-1 text-xs rounded-md w-full font-bold transition-all pr-7 cursor-pointer ${
                              getStatusBadgeClass(item.status || '', item.isCompleted)
                            }`}
                          >
                            <option value="">選擇狀態...</option>
                            {statuses.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            <option value="__add_new__" className="text-wood-dark font-semibold">＋ 自訂新增選項...</option>
                          </select>
                        </td>

                        {/* Proofing Deadline Date */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isRowUrgent ? 'text-red-500' : 'text-text-main/40'}`} />
                            <div className="relative flex items-center w-full">
                              <input
                                type="date"
                                value={item.proofDeadline}
                                onChange={(e) => onUpdateItem(item.id, 'proofDeadline', e.target.value)}
                                className={`bg-transparent hover:bg-bg-paper/50 border border-transparent hover:border-line focus:border-wood-dark focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-xs font-mono w-full cursor-pointer ${
                                  item.isCompleted 
                                    ? 'text-text-main/40' 
                                    : isRowUrgent 
                                      ? 'text-red-600 font-bold' 
                                      : 'text-text-main'
                                }`}
                              />
                              {!item.isCompleted && isRowUrgent && (
                                <AlertCircle className="w-4 h-4 text-red-500 ml-1 shrink-0 animate-pulse" title="對稿截止日期在 3 天內或已逾期！" />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Completion Date */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-text-main/40 flex-shrink-0" />
                            <input
                              type="date"
                              value={item.completionDate}
                              onChange={(e) => onUpdateItem(item.id, 'completionDate', e.target.value)}
                              className={`bg-transparent hover:bg-bg-paper/50 border border-transparent hover:border-line focus:border-wood-dark focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-xs font-mono w-full cursor-pointer ${
                                item.isCompleted ? 'text-text-main/40' : 'text-text-main'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Notes (Remarks) Column */}
                        <td className="px-4 py-2.5">
                          <textarea
                            value={item.notes || ''}
                            onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
                            placeholder="無備註..."
                            className={`bg-stone-50 hover:bg-white focus:bg-white focus:outline-none border border-stone-200 focus:border-wood-dark px-2 py-1.5 rounded-lg w-full text-xs font-semibold resize-y min-h-[38px] transition-all leading-normal ${
                              item.isCompleted ? 'text-text-main/40' : 'text-text-main'
                            }`}
                            rows={1}
                          />
                        </td>

                        {/* Attachment Column */}
                        <td className="px-4 py-2.5">
                          <div style={{ width: '104.443px' }} className="mx-auto flex justify-center">
                            {item.attachmentUrl ? (
                              <div style={{ width: '89.432px' }} className="flex items-center justify-between gap-1 bg-stone-50 border border-stone-200 rounded-md px-1.5 h-[30px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewAttachment({
                                      name: item.attachmentName || '檔案',
                                      url: item.attachmentUrl || ''
                                    });
                                    setImageLoadError(false);
                                  }}
                                  className="flex items-center gap-1 text-wood-dark hover:text-[#8B6D53] transition-all min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
                                  title={`預覽此附件: ${item.attachmentName || '檔案'}`}
                                >
                                  <Paperclip className="w-3 h-3 flex-shrink-0 text-wood-light" />
                                  <span className="truncate underline decoration-dotted hover:decoration-solid text-[10px] font-bold text-stone-800 leading-tight">
                                    {item.attachmentName || '檔案'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateItem(item.id, {
                                      attachmentName: '',
                                      attachmentUrl: ''
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5 rounded transition-all cursor-pointer flex-shrink-0 ml-0.5"
                                  title="移除附件"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label style={{ width: '89.432px' }} className="flex items-center justify-center gap-1 px-1.5 bg-white border border-dashed border-stone-300 hover:border-wood-dark text-stone-500 hover:text-wood-dark rounded-md cursor-pointer transition-all text-[10px] font-semibold h-[30px]">
                                <Paperclip className="w-3 h-3 text-stone-400 flex-shrink-0" />
                                <span className="truncate">上傳附件</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".doc,.docx,.xls,.xlsx,.pdf,image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 700 * 1024) {
                                        alert('因雲端儲存規範，附件檔案大小不能超過 700KB！建議上傳壓縮過的圖片或小型文檔。');
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const base64 = event.target?.result as string;
                                        onUpdateItem(item.id, {
                                          attachmentName: file.name,
                                          attachmentUrl: base64
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </td>

                        {/* Safe State-driven Confirmation cell */}
                        <td className="px-4 py-2.5 text-center">
                          {deleteConfirmId === item.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteItem(item.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold transition-colors cursor-pointer"
                              >
                                是
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 text-[10px] rounded font-medium transition-colors cursor-pointer"
                              >
                                否
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`delete-row-${item.id}`}
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                              title="刪除此排程"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 3. CALENDAR VIEW MODE */}
      {viewMode === 'calendar' && (
        <div className="bg-white overflow-hidden animate-fadeIn">
          {/* Sub Navigation Bar */}
          <div className="bg-stone-50 px-6 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-stone-500">檢視範圍:</span>
              <div className="flex rounded-md border border-stone-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setCalendarType('month')}
                  className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                    calendarType === 'month' ? 'bg-wood-dark/15 text-wood-dark' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  月表 (Month)
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarType('week')}
                  className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                    calendarType === 'week' ? 'bg-wood-dark/15 text-wood-dark' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  週表 (Week)
                </button>
              </div>
            </div>

            {/* Time period switcher */}
            <div className="flex items-center gap-1.5 font-sans">
              <button
                type="button"
                onClick={handlePrevPeriod}
                className="p-1 hover:bg-stone-200 border border-stone-300 rounded text-stone-600 bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="font-serif font-bold text-sm text-wood-dark px-2.5 min-w-[130px] text-center">
                {calendarType === 'month' ? (
                  `${calendarCenterDate.getFullYear()} 年 ${monthNames[calendarCenterDate.getMonth()]}`
                ) : (
                  `自 ${formatDateString(new Date(calendarCenterDate.getTime() - calendarCenterDate.getDay() * 24 * 60 * 60 * 1000))} 起`
                )}
              </span>

              <button
                type="button"
                onClick={handleNextPeriod}
                className="p-1 hover:bg-stone-200 border border-stone-300 rounded text-stone-600 bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTodayPeriod}
                className="px-2.5 py-1 border border-stone-300 rounded text-stone-600 bg-white hover:bg-stone-100 font-semibold cursor-pointer text-[11px]"
              >
                今日
              </button>
            </div>
          </div>

          {/* Month Calendar Grid */}
          {calendarType === 'month' ? (
            <div className="grid grid-cols-7 border-b border-line">
              {/* Mon-Sun titles */}
              {weekdayNames.map(wd => (
                <div key={wd} className="bg-stone-50/50 py-2.5 border-r border-line text-center font-bold text-stone-600 text-xs last:border-r-0">
                  {wd}
                </div>
              ))}

              {generateMonthCells().map((cell, idx) => {
                const dateDeadlines = getDeadlinesForDate(cell.dateStr);
                const isToday = cell.dateStr === formatDateString(new Date());

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`min-h-[110px] border-t border-r border-line p-2 flex flex-col space-y-1.5 transition-colors overflow-hidden last:border-r-0 hover:bg-stone-50/30 ${
                      cell.isCurrentMonth ? 'bg-white' : 'bg-stone-50/50 opacity-60'
                    } ${isToday ? 'bg-amber-50/30 ring-2 ring-inset ring-wood-light/30' : ''}`}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-mono font-bold ${
                        isToday 
                          ? 'bg-wood-dark text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs' 
                          : cell.isCurrentMonth 
                            ? 'text-stone-700' 
                            : 'text-stone-400'
                      }`}>
                        {cell.date.getDate()}
                      </span>
                      {dateDeadlines.length > 0 && (
                        <span className="text-[9px] font-bold text-[#8B6D53] bg-[#C4A47C]/15 px-1.5 py-0.5 rounded-full">
                          {dateDeadlines.length} 筆
                        </span>
                      )}
                    </div>

                    {/* Schedule deadline tags */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[72px] scrollbar-thin">
                      {dateDeadlines.map((item) => {
                        const isDeadline = item.proofDeadline === cell.dateStr;
                        const isDone = item.isCompleted;

                        return (
                          <div
                            key={item.id}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium truncate flex items-center gap-1 border ${
                              isDone
                                ? 'bg-green-50 border-green-200/60 text-green-700'
                                : isDeadline
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold'
                                  : 'bg-stone-50 border-stone-200 text-stone-600'
                            }`}
                            title={`${item.code ? `[${item.code}] ` : ''}${item.name} (${isDeadline ? '對稿' : '完工'}截止)`}
                          >
                            {isDone && <Check className="w-2 h-2" />}
                            <span className="font-mono font-bold opacity-85">
                              {item.code || '手動'}
                            </span>
                            <span className="truncate">
                              {isDeadline ? '📝對稿' : '📦完成'}: {item.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Week Calendar Grid view */
            <div className="grid grid-cols-7 divide-x divide-line min-h-[300px]">
              {generateWeekCells().map((cell, idx) => {
                const dateDeadlines = getDeadlinesForDate(cell.dateStr);
                const isToday = cell.dateStr === formatDateString(new Date());
                const dayOfWeek = cell.date.getDay();

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`p-4 flex flex-col space-y-3 transition-colors ${
                      isToday ? 'bg-amber-50/25 ring-2 ring-inset ring-wood-light/20' : 'bg-white'
                    }`}
                  >
                    {/* Day indicator */}
                    <div className="border-b border-stone-100 pb-2.5 flex flex-col">
                      <span className="text-xs text-stone-400 font-bold tracking-wider">
                        {weekdayNames[dayOfWeek]}
                      </span>
                      <span className={`text-lg font-serif font-bold mt-0.5 ${
                        isToday ? 'text-wood-dark' : 'text-stone-700'
                      }`}>
                        {cell.date.getDate()} 日
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {cell.dateStr}
                      </span>
                    </div>

                    {/* Deadline items list in detail for the week days */}
                    <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
                      {dateDeadlines.length === 0 ? (
                        <div className="text-[10px] text-stone-300 italic py-4 text-center">
                          無排程
                        </div>
                      ) : (
                        dateDeadlines.map((item) => {
                          const isDeadline = item.proofDeadline === cell.dateStr;
                          const isDone = item.isCompleted;

                          return (
                            <div
                              key={item.id}
                              className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                                isDone
                                  ? 'bg-green-50/70 border-green-200/50 text-stone-400'
                                  : isDeadline
                                    ? 'bg-amber-50 border-amber-200/70 text-amber-900 shadow-3xs'
                                    : 'bg-[#FAF9F6] border-line text-stone-700'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {item.code ? (
                                  <span className="px-1 py-0.2 rounded-full bg-wood-dark text-white font-mono text-[8px] font-bold">
                                    {item.code}
                                  </span>
                                ) : (
                                  <span className="px-1 py-0.2 rounded bg-stone-200 text-stone-600 text-[8px]">
                                    手動
                                  </span>
                                )}
                                <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                                  isDeadline ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'
                                }`}>
                                  {isDeadline ? '對稿' : '預定交貨'}
                                </span>
                              </div>
                              
                              <p className={`font-semibold line-clamp-2 ${isDone ? 'line-through opacity-60' : ''}`}>
                                {item.name}
                              </p>

                              {/* Department and owner indicator */}
                              <div className="text-[9px] text-stone-400 flex items-center justify-between pt-1">
                                <span>{item.department || '未指派單位'}</span>
                                <span className="font-bold">{item.owner || '無'}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* 3.5 GANTT CHART VISUALIZATION SECTION */}
      <div id="gantt-chart-section" className="bg-white rounded-xl border p-6 shadow-sm font-sans" style={{ borderColor: '#6c7072' }}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-wood-dark" />
            <h3 className="text-sm font-bold text-wood-dark font-serif tracking-wide">
              📊 專案工期甘特圖 (對稿截止 ➡️ 預計完成)
            </h3>
          </div>
          <span className="text-[10px] bg-wood-light/10 text-wood-dark px-2.5 py-0.5 rounded-full font-bold">
            時序排程視覺化
          </span>
        </div>

        {ganttData.length === 0 ? (
          <div className="py-10 text-center text-stone-400 text-xs font-medium">
            請為排程項目設定「對稿截止日」或「預計完成日」，系統將自動繪製甘特圖。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-[320px] pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ganttData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#E5E7EB" />
                  <XAxis 
                    type="number" 
                    domain={['dataMin - 86400000', 'dataMax + 86400000']} 
                    tickFormatter={formatXAxis}
                    stroke="#78716c"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150} 
                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                    stroke="#78716c"
                    fontSize={10}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      return (
                        <text x={x - 5} y={y + 4} fontSize="12" fill="#78716c" textAnchor="end">
                          {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                        </text>
                      );
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-stone-200 shadow-md rounded-lg text-xs font-sans">
                            <p className="font-bold text-stone-800">{data.code && data.code !== '手動' ? `[${data.code}] ` : ''}{data.name}</p>
                            <div className="text-stone-500 mt-1 space-y-0.5">
                              <p>單位: <span className="font-semibold">{data.department}</span> | 負責人: <span className="font-semibold">{data.owner}</span></p>
                              <p>對稿截止日: <span className="font-semibold font-mono text-amber-700">{data.startStr || '未定'}</span></p>
                              <p>預計完成日: <span className="font-semibold font-mono text-emerald-700">{data.endStr || '未定'}</span></p>
                              <p className="text-[#8B6D53] font-bold mt-1">預估工期: {data.duration} 天</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="range" 
                    radius={4}
                    onClick={(data) => {
                      if (data && data.id) {
                        const foundItem = items.find(i => i.id === data.id);
                        if (foundItem) {
                          setSelectedGanttItem(foundItem);
                          setNewCommentAuthor(foundItem.owner || foundItem.designer || owners[0] || '');
                        }
                      }
                    }}
                  >
                    {ganttData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isCompleted ? '#D1D5DB' : '#e1b103'}
                        className="cursor-pointer hover:opacity-80 transition-all"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-stone-400 mt-3 pl-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#e1b103] rounded" />
                <span>進行中項目</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded" />
                <span>已完工項目</span>
              </div>
              <span className="ml-auto italic">💡 提示：點擊橫欄可直接查看更詳細的時序窗口，滑鼠懸停顯示對稿及完成天數。</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Grid footer helper logs */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-wood-dark/70 px-4 py-1.5 gap-2 bg-[#FAF9F6] border border-line rounded-lg">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-wood-light" />
          <span>點選任一項目欄位可展開聯絡窗口或下拉編輯。行事曆模式提供月表及週表一目瞭然進度追蹤。</span>
        </div>
        <div className="flex items-center gap-3">
          <span>項目總數: <b>{items.length}</b> 件</span>
          <span className="text-accent-green font-semibold">已完工: <b>{items.filter(i => i.isCompleted).length}</b> 件</span>
          <span className="text-wood-dark/90">進行中: <b>{items.filter(i => !i.isCompleted).length}</b> 件</span>
        </div>
      </div>

      {/* 5. GANTT ITEM DETAIL & DIALOGUE MODAL */}
      {selectedGanttItem && (() => {
        const currentItem = items.find(i => i.id === selectedGanttItem.id) || selectedGanttItem;
        const linkedContact = currentItem.contactId ? contacts.find(c => c.id === currentItem.contactId) : null;
        
        // Parse comments
        const comments = currentItem.notes ? currentItem.notes.split('\n').filter(Boolean).map((line, idx) => {
          const match = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/);
          if (match) {
            return {
              id: `${idx}`,
              timestamp: match[1],
              author: match[2],
              content: match[3],
              isSystem: false
            };
          }
          return {
            id: `${idx}`,
            content: line,
            isSystem: true
          };
        }) : [];

        // Assign a distinct color style based on author name deterministically
        const getAuthorBadgeStyle = (author: any) => {
          const colorPairs = [
            { bg: 'bg-amber-100 text-amber-800 border-amber-200' },
            { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
            { bg: 'bg-rose-100 text-rose-800 border-rose-200' },
            { bg: 'bg-sky-100 text-sky-800 border-sky-200' },
            { bg: 'bg-purple-100 text-purple-800 border-purple-200' },
            { bg: 'bg-teal-100 text-teal-800 border-teal-200' },
            { bg: 'bg-orange-100 text-orange-800 border-orange-200' },
            { bg: 'bg-blue-100 text-blue-800 border-blue-200' },
            { bg: 'bg-pink-100 text-pink-800 border-pink-200' },
          ];
          if (!author || typeof author !== 'string') {
            return colorPairs[0].bg;
          }
          let hash = 0;
          for (let i = 0; i < author.length; i++) {
            hash = author.charCodeAt(i) + ((hash << 5) - hash);
          }
          const index = Math.abs(hash) % colorPairs.length;
          return colorPairs[index].bg;
        };

        const handleAddCommentSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newCommentText.trim()) return;

          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

          const authorName = newCommentAuthor.trim() || '系統使用者';
          const newCommentLine = `[${timestamp}] ${authorName}: ${newCommentText.trim()}`;
          
          const updatedNotes = currentItem.notes
            ? `${currentItem.notes}\n${newCommentLine}`
            : newCommentLine;

          onUpdateItem(currentItem.id, 'notes', updatedNotes);
          setNewCommentText('');
        };

        return (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-wood-dark text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-wood-light animate-pulse" />
                  <span className="font-serif font-bold tracking-wide text-sm md:text-base">
                    📌 項目時序詳細資訊
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGanttItem(null)}
                  className="p-1 text-stone-300 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Basic Info Box */}
                <div className="bg-[#FAF9F6] border border-line rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {currentItem.code && (
                      <span className="bg-wood-dark text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {currentItem.code}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider ${
                      currentItem.isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {currentItem.isCompleted ? '已完工' : '進行中'}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-wood-dark">
                    {currentItem.name}
                  </h4>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs border-t border-stone-200/60 text-stone-600">
                    <div>
                      <span className="block text-[10px] text-stone-400 font-semibold mb-0.5">設計單位</span>
                      <span className="font-bold">{currentItem.department || '無'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 font-semibold mb-0.5">設計師</span>
                      <span className="font-bold">{currentItem.designer || '無'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 font-semibold mb-0.5">負責人</span>
                      <span className="font-bold">{currentItem.owner || '無'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 font-semibold mb-0.5">負責廠商</span>
                      <span className="font-bold">{currentItem.vendor || '無'}</span>
                    </div>
                  </div>
                </div>

                {/* Deadlines Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-stone-200/80 rounded-lg p-3 bg-white">
                    <span className="block text-[10px] text-stone-400 font-semibold mb-1">📝 對稿截止日</span>
                    <input
                      type="date"
                      value={currentItem.proofDeadline}
                      onChange={(e) => onUpdateItem(currentItem.id, 'proofDeadline', e.target.value)}
                      className="w-full text-xs font-mono font-bold text-amber-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="border border-stone-200/80 rounded-lg p-3 bg-white">
                    <span className="block text-[10px] text-stone-400 font-semibold mb-1">📦 預定完成日</span>
                    <input
                      type="date"
                      value={currentItem.completionDate}
                      onChange={(e) => onUpdateItem(currentItem.id, 'completionDate', e.target.value)}
                      className="w-full text-xs font-mono font-bold text-emerald-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="border border-stone-200/80 rounded-lg p-3 bg-[#FAF9F6] flex flex-col justify-center">
                    <span className="block text-[10px] text-stone-400 font-semibold">🕒 估計工期</span>
                    <span className="text-sm font-bold text-wood-dark mt-0.5">
                      {(() => {
                        const s = new Date(currentItem.proofDeadline);
                        const e = new Date(currentItem.completionDate);
                        if (isNaN(s.getTime()) || isNaN(e.getTime())) return '未定';
                        const days = Math.ceil((Math.max(s.getTime(), e.getTime()) - Math.min(s.getTime(), e.getTime())) / (1000 * 60 * 60 * 24)) + 1;
                        return `${days} 天`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Quick Status Control */}
                <div className="flex flex-col sm:flex-row gap-4 border-t border-stone-100 pt-4">
                  <div className="flex-1">
                    <label className="block text-[10px] text-stone-400 font-semibold mb-1.5">進度狀態</label>
                    <select
                      value={currentItem.status || ''}
                      onChange={(e) => onUpdateItem(currentItem.id, 'status', e.target.value)}
                      className="w-full text-xs font-semibold bg-[#FAF9F6] border border-line rounded-lg p-2 text-text-main focus:outline-none focus:border-wood-dark cursor-pointer"
                    >
                      <option value="">無</option>
                      {statuses.filter(s => s !== '__add_new__').map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none border border-stone-200 rounded-lg px-4 py-2 bg-stone-50 hover:bg-stone-100 transition-all">
                      <input
                        type="checkbox"
                        checked={currentItem.isCompleted}
                        onChange={(e) => onUpdateItem(currentItem.id, 'isCompleted', e.target.checked)}
                        className="w-4 h-4 rounded border-stone-300 text-wood-dark focus:ring-wood-light cursor-pointer"
                      />
                      <span className="text-xs font-bold text-stone-700">標記為已完工</span>
                    </label>
                  </div>
                </div>

                {/* Connected Contact Detail */}
                {linkedContact && (
                  <div className="border border-wood-light/20 bg-wood-light/5 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-wood-dark font-bold tracking-wider">📞 聯絡窗口資訊</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGanttItem(null);
                          onOpenContactModal(linkedContact.id, currentItem.id);
                        }}
                        className="text-[10px] font-bold text-wood-dark hover:underline cursor-pointer"
                      >
                        編輯聯絡人
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-stone-400 block text-[10px]">聯絡姓名</span>
                        <span className="font-bold text-stone-700">{linkedContact.name}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">公司電話</span>
                        <span className="font-mono text-stone-700">{linkedContact.companyPhone || '無'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">手機號碼 / LINE ID</span>
                        <span className="font-mono text-stone-700">
                          {linkedContact.mobile || '無'} {linkedContact.lineId ? `(LINE: ${linkedContact.lineId})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dialogue/Conversation Records (備註與討論紀錄) */}
                <div className="space-y-3 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-wood-dark" />
                    <span className="text-xs font-bold text-wood-dark">
                      💬 對話紀錄與時序備註 ({comments.length} 筆)
                    </span>
                  </div>

                  {/* Comment List */}
                  <div className="border border-stone-200/80 rounded-xl bg-stone-50/50 p-4 max-h-[220px] overflow-y-auto space-y-3 scrollbar-thin">
                    {comments.length === 0 ? (
                      <div className="text-center py-6 text-stone-400 italic text-xs">
                        目前尚無討論對話，請在下方新增您的第一筆紀錄。
                      </div>
                    ) : (
                      comments.map((c) => {
                        if (c.isSystem) {
                          return (
                            <div key={c.id} className="bg-[#FAF9F6] border border-stone-200/60 rounded-lg p-2.5 text-xs text-stone-600 italic leading-relaxed">
                              📌 {c.content}
                            </div>
                          );
                        }
                        return (
                          <div key={c.id} className="flex flex-col gap-1 bg-white border border-stone-100 p-2.5 rounded-lg shadow-3xs">
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className={`font-bold border px-2 py-0.5 rounded flex items-center gap-1 shadow-3xs ${getAuthorBadgeStyle(c.author)}`}>
                                <span>👤</span> {c.author}
                              </span>
                              <span className="font-mono text-stone-400">
                                {c.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-stone-700 font-medium pl-1 mt-1 leading-normal">
                              {c.content}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add New Comment Form */}
                  <form onSubmit={handleAddCommentSubmit} className="space-y-3 bg-[#FAF9F6] border border-stone-200/60 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="sm:w-1/3">
                        <label className="block text-[10px] text-stone-400 font-semibold mb-1">發言人</label>
                        <select
                          value={newCommentAuthor}
                          onChange={(e) => setNewCommentAuthor(e.target.value)}
                          className="w-full text-xs font-bold bg-white border border-line rounded-lg p-2 focus:outline-none focus:border-wood-dark cursor-pointer"
                        >
                          <option value="">選擇人員...</option>
                          {owners.map(o => (
                            <option key={o} value={o}>負責人: {o}</option>
                          ))}
                          {designers.map(d => (
                            <option key={d} value={d}>設計師: {d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-stone-400 font-semibold mb-1">留言/紀錄內容</label>
                        <input
                          type="text"
                          required
                          placeholder="例如：[企劃] 產品打樣已確認，等待廠端印刷批次生產..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          className="w-full text-xs font-medium bg-white border border-line rounded-lg p-2 focus:outline-none focus:border-wood-dark"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="bg-wood-dark hover:bg-wood-light text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        新增紀錄
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Footer */}
              <div className="bg-stone-50 border-t border-line px-6 py-3.5 flex justify-between items-center text-xs">
                <span className="text-stone-400 font-mono text-[10px]">
                  ID: {currentItem.id.substring(0, 8)}...
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGanttItem(null)}
                  className="px-4 py-1.5 border border-stone-300 hover:bg-stone-100 rounded-lg font-bold text-stone-700 transition-all cursor-pointer"
                >
                  關閉視窗
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 4. Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden text-stone-900 font-sans flex flex-col max-h-[85vh] animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2 text-[#8B6D53]">
                <Paperclip className="w-4 h-4 text-wood-light" />
                <h3 className="font-bold text-sm tracking-wide break-all">{previewAttachment.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="w-7 h-7 rounded-full bg-stone-200/50 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-stone-50/40 flex flex-col items-center justify-center min-h-[300px]">
              
              <div className="w-full text-center mb-4">
                <h4 className="text-sm font-bold text-stone-800 break-all px-4">{previewAttachment.name}</h4>
              </div>

              {/* Conditional Preview */}
              {(() => {
                try {
                  const name = previewAttachment.name || '';
                  const url = previewAttachment.url || '';
                  
                  const isImage = url.startsWith('data:image/') || 
                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
                  
                  if (isImage) {
                    if (imageLoadError) {
                      return (
                        <div className="border border-stone-200 rounded-xl bg-white p-8 max-w-md w-full text-center shadow-xs flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100 shadow-2xs">
                            <FileText className="w-8 h-8" />
                          </div>
                          <p className="text-xs font-bold text-stone-700 mb-1">圖片載入受限</p>
                          <p className="text-[11px] text-stone-400 mb-3 font-mono">
                            解析度或格式在當前沙盒環境無法直接解碼
                          </p>
                          <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-left w-full">
                            <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                              💡 <b>提示：</b> 為了您的資訊安全，請點擊下方的「下載檔案」按鈕至您的本機，即可順利查閱完整圖片！
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="relative border border-stone-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-[400px] flex items-center justify-center p-2 group">
                        <img 
                          src={url} 
                          alt={name} 
                          referrerPolicy="no-referrer"
                          onError={() => setImageLoadError(true)}
                          className="max-h-[380px] max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]" 
                        />
                      </div>
                    );
                  } else if (url.startsWith('data:application/pdf') || /\.pdf$/i.test(name)) {
                    return (
                      <div className="w-full h-[350px] border border-stone-200 rounded-xl overflow-hidden bg-white shadow-inner flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4 shadow-sm">
                          <FileText className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-stone-700 mb-2">PDF 文件檔案</p>
                        <p className="text-[11px] text-stone-400 max-w-xs leading-relaxed mb-4">
                          PDF 文件已成功上傳。點擊下方「下載檔案」按鈕即可在本機快速瀏覽完整排程文檔。
                        </p>
                        <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-left w-full max-w-sm">
                          <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                            💡 <b>提示：</b> PDF 格式在特定瀏覽器沙盒中無法直接內嵌，請直接下載本機查看最為安全穩定。
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    const ext = name.split('.').pop()?.toUpperCase() || '未知';
                    return (
                      <div className="border border-stone-200 rounded-xl bg-white p-8 max-w-md w-full text-center shadow-xs flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-stone-100 text-wood-dark flex items-center justify-center mb-4 border border-stone-200/50 shadow-2xs">
                          <FileText className="w-8 h-8 text-wood-light" />
                        </div>
                        <p className="text-xs font-bold text-stone-700 mb-1">本機文件 / 檔案</p>
                        <p className="text-[11px] text-stone-400 mb-3 font-mono">
                          類型：{ext} 檔案
                        </p>
                        <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-left w-full">
                          <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                            💡 <b>提示：</b> 此檔案格式不支援在瀏覽器中直接解碼預覽。請點擊下方的「下載檔案」按鈕，即可將其儲存於您的本機並順利開啟閱讀！
                          </p>
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  return (
                    <div className="border border-stone-200 rounded-xl bg-white p-8 max-w-md w-full text-center shadow-xs flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100 shadow-2xs">
                        <X className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-bold text-stone-700 mb-1">預覽發生異常</p>
                      <p className="text-[11px] text-stone-400 mb-3">
                        該檔案編碼不相容，請點擊下方下載按鈕在本機開啟
                      </p>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
              <span className="text-[10px] text-stone-400 font-mono">
                大小: ~{((previewAttachment.url || '').length * 0.75 / 1024).toFixed(1)} KB
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-1.5 border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-bold text-stone-700 transition-all cursor-pointer"
                >
                  關閉
                </button>
                {previewAttachment.url && (
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name}
                    className="flex items-center gap-1 bg-[#8B6D53] hover:bg-wood-dark text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下載檔案
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
