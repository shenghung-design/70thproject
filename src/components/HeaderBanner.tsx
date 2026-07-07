import React, { useState } from 'react';
import { Project } from '../types';
import { Layers, Plus, History, Download, Users, Wifi, WifiOff, Sparkles, Check, Edit2, Trash2, X, Database, Upload } from 'lucide-react';

interface HeaderBannerProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string, templateType: 'diagram' | 'checklist') => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  isFirebaseSynced: boolean;
  onOpenHistory: () => void;
  onExport: () => void;
  currentUserUnit?: string;
  onSetUserUnit?: (unit: string) => void;
  userUnits?: string[];
  onUpdateUserUnits?: (units: string[]) => void;
  historyLogs?: any[];
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
}

export default function HeaderBanner({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  isFirebaseSynced,
  onOpenHistory,
  onExport,
  currentUserUnit,
  onSetUserUnit,
  userUnits = ['勝陽', '企劃部', '廠務課'],
  onUpdateUserUnits,
  historyLogs,
  onExportBackup,
  onImportBackup
}: HeaderBannerProps) {
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState<'diagram' | 'checklist'>('diagram');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Unit edit / add states
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [editingUnitName, setEditingUnitName] = useState('');
  const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  
  // Inline rename on double click
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const handleStartRename = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditNameValue(proj.name.replace('🎉 ', ''));
  };

  const handleFinishRename = (id: string) => {
    const trimmed = editNameValue.trim();
    if (trimmed) {
      onRenameProject(id, `🎉 ${trimmed}`);
    }
    setEditingProjectId(null);
  };
  
  // Simulating live active users as requested: "共用設定：右上角顯示「目前在線人數」（因應免登入共編需求，可顯示如：3人正在查看此專案）"
  const [liveUsersCount] = useState(3);

  // Find last edit timestamp for each unit in historyLogs
  const getLastEditTime = (unitName: string) => {
    if (!historyLogs || historyLogs.length === 0) return '暫無編輯紀錄';
    const logsOfUnit = historyLogs.filter(l => l.userName === unitName);
    if (logsOfUnit.length === 0) return '暫無編輯紀錄';
    
    // Format timestamp nicely
    const diff = Date.now() - logsOfUnit[0].timestamp;
    if (diff < 60000) return '剛剛';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} 分鐘前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小時前`;
    
    const date = new Date(logsOfUnit[0].timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProjectName.trim();
    if (!cleanName) return;
    onAddProject(cleanName, newProjectTemplate);
    setNewProjectName('');
    setShowAddPrompt(false);
  };

  return (
    <header className="border-b border-line font-sans text-text-main flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FFFDE7 0%, #E8F5E9 50%, #FFE0B2 100%)' }}>
      {/* Top Premium Brand Bar */}
      <div className="px-6 pt-4 pb-1.5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wood-light flex items-center justify-center text-white font-serif font-bold text-lg shadow-xs">
            70
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif tracking-widest font-bold text-sm md:text-base text-wood-dark">
                勝宏集團 SHENG HUNG 70th
              </h1>
              <span className="text-[10px] bg-wood-light/15 text-wood-dark border border-wood-light/20 px-2 py-0.5 rounded font-semibold tracking-widest uppercase">
                EST. 1956
              </span>
            </div>
          </div>
        </div>

        {/* Live Status and Shared controls */}
        <div className="flex items-center gap-4 text-xs flex-wrap">

          {/* Firebase Sync Connection Status Badge */}
          <div className="flex items-center">
            {isFirebaseSynced ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 shadow-2xs">
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>雲端同步已連線</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 shadow-2xs">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>本地離線暫存</span>
              </span>
            )}
          </div>

          {/* Active Users Avatars with Dropdown Selector */}
          <div className="relative">
            <button
              type="button"
              id="active-user-switcher-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-text-main/80 bg-white hover:bg-stone-50 px-2.5 py-1.5 rounded-lg border border-line shadow-2xs transition-all cursor-pointer focus:outline-none"
              title="點擊切換您的編輯身分，查看各單位最近編輯時間"
            >
              <div className="flex -space-x-1.5">
                {userUnits.slice(0, 3).map((unit, idx) => {
                  const colors = [
                    'bg-accent-green',
                    'bg-[#8B6D53]',
                    'bg-accent-blue',
                    'bg-amber-600',
                    'bg-rose-500',
                    'bg-indigo-500'
                  ];
                  const bgCol = colors[idx % colors.length];
                  const isCurrent = currentUserUnit === unit;
                  return (
                    <div 
                      key={unit}
                      className={`w-6 h-6 rounded-full ${bgCol} border border-white flex items-center justify-center text-[9px] font-bold text-white relative ${isCurrent ? 'ring-2 ring-amber-600 ring-offset-1 scale-110 z-10' : 'opacity-80'}`}
                    >
                      {unit.substring(0, 1)}
                      {isCurrent && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-600 border border-white"></span>}
                    </div>
                  );
                })}
              </div>
              <div className="text-left">
                <div className="text-[9px] text-stone-400 font-bold leading-none">免登入共編</div>
                <div className="text-[11px] font-semibold text-stone-700 mt-0.5 flex items-center gap-1">
                  <span>您是: <b>{currentUserUnit || '勝陽'}</b></span>
                  <span className="text-[9px] text-[#8B6D53]">▼</span>
                </div>
              </div>
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-line shadow-xl py-3 z-40 animate-scaleIn text-stone-800">
                  <div className="px-4 pb-2 mb-2 border-b border-stone-100">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">選擇您的編輯身分 / 單位</p>
                    <p className="text-[9px] text-stone-500 mt-0.5 leading-relaxed">免登入共編中。選擇或新增單位後，系統會將您隨後的編輯操作標記為對應部門。</p>
                  </div>
                  
                  <div className="space-y-1 px-2 max-h-[250px] overflow-y-auto">
                    {userUnits.map((unit, idx) => {
                      const isCurrent = currentUserUnit === unit;
                      const isEditingThis = editingUnitIndex === idx;
                      const colors = [
                        'bg-accent-green',
                        'bg-[#8B6D53]',
                        'bg-accent-blue',
                        'bg-amber-600',
                        'bg-rose-500',
                        'bg-indigo-500'
                      ];
                      const bgCol = colors[idx % colors.length];

                      if (isEditingThis) {
                        return (
                          <div key={unit} className="flex items-center gap-1.5 p-1 bg-stone-50 rounded-lg border border-stone-200">
                            <input
                              type="text"
                              className="flex-1 text-xs px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none focus:border-wood-dark text-stone-800 font-semibold"
                              value={editingUnitName}
                              onChange={(e) => setEditingUnitName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const cleaned = editingUnitName.trim();
                                  if (cleaned && !userUnits.includes(cleaned)) {
                                    const updated = [...userUnits];
                                    updated[idx] = cleaned;
                                    onUpdateUserUnits?.(updated);
                                    if (isCurrent) {
                                      onSetUserUnit?.(cleaned);
                                    }
                                    setEditingUnitIndex(null);
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingUnitIndex(null);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const cleaned = editingUnitName.trim();
                                if (cleaned) {
                                  const updated = [...userUnits];
                                  updated[idx] = cleaned;
                                  onUpdateUserUnits?.(updated);
                                  if (isCurrent) {
                                    onSetUserUnit?.(cleaned);
                                  }
                                  setEditingUnitIndex(null);
                                }
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              title="儲存"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUnitIndex(null)}
                              className="p-1 text-stone-400 hover:bg-stone-100 rounded cursor-pointer"
                              title="取消"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={unit}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold group border transition-all ${
                            isCurrent
                              ? 'bg-amber-50/80 text-amber-900 border-amber-100'
                              : 'bg-transparent text-stone-700 border-transparent hover:bg-stone-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSetUserUnit?.(unit);
                              setIsDropdownOpen(false);
                            }}
                            className="flex-1 flex items-center gap-2 text-left cursor-pointer focus:outline-none"
                          >
                            <span className={`w-5 h-5 rounded-full ${bgCol} text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0`}>
                              {unit.substring(0, 1)}
                            </span>
                            <div className="text-left min-w-0 flex-1">
                              <p className="truncate max-w-[110px]">{unit}</p>
                              <p className="text-[9px] text-stone-400 font-medium">最後編輯：{getLastEditTime(unit)}</p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingUnitIndex(idx);
                                setEditingUnitName(unit);
                              }}
                              className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-all cursor-pointer"
                              title="編輯名稱"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {userUnits.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = userUnits.filter((_, i) => i !== idx);
                                  onUpdateUserUnits?.(updated);
                                  if (isCurrent) {
                                    onSetUserUnit?.(updated[0] || '勝陽');
                                  }
                                }}
                                className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                                title="刪除此單位"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-amber-600 ml-1.5 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-100 px-2">
                    {isAddingNewUnit ? (
                      <div className="flex items-center gap-1.5 p-1 bg-stone-50 rounded-lg border border-stone-200">
                        <input
                          type="text"
                          className="flex-1 text-xs px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none focus:border-wood-dark text-stone-800 font-semibold"
                          placeholder="輸入新單位名稱..."
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const cleaned = newUnitName.trim();
                              if (cleaned && !userUnits.includes(cleaned)) {
                                onUpdateUserUnits?.([...userUnits, cleaned]);
                                setNewUnitName('');
                                setIsAddingNewUnit(false);
                              }
                            } else if (e.key === 'Escape') {
                              setIsAddingNewUnit(false);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cleaned = newUnitName.trim();
                            if (cleaned && !userUnits.includes(cleaned)) {
                              onUpdateUserUnits?.([...userUnits, cleaned]);
                              setNewUnitName('');
                              setIsAddingNewUnit(false);
                            }
                          }}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          title="新增"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewUnit(false)}
                          className="p-1 text-stone-400 hover:bg-stone-100 rounded cursor-pointer"
                          title="取消"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewUnit(true);
                          setNewUnitName('');
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-stone-300 hover:border-[#8B6D53] hover:text-[#8B6D53] text-stone-500 rounded-lg text-xs font-semibold cursor-pointer transition-all bg-stone-50/50 hover:bg-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增協作單位</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export and History triggers */}
          <button
            id="open-history-modal-btn"
            onClick={onOpenHistory}
            className="flex items-center gap-1 text-[#8B6D53] hover:text-white bg-[#FAF9F6] border border-line hover:bg-[#8B6D53] px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
            title="查看操作歷史紀錄與刪除復原"
          >
            <History className="w-3.5 h-3.5" />
            <span>變更歷程</span>
          </button>

          {onExportBackup && (
            <button
              id="export-backup-btn"
              onClick={onExportBackup}
              className="flex items-center gap-1 text-[#8B6D53] hover:text-white bg-[#FAF9F6] border border-line hover:bg-[#8B6D53] px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
              title="匯出整站資料備份 (.json)"
            >
              <Database className="w-3.5 h-3.5" />
              <span>備份資料</span>
            </button>
          )}

          {onImportBackup && (
            <label
              id="import-backup-label"
              className="flex items-center gap-1 text-[#8B6D53] hover:text-white bg-[#FAF9F6] border border-line hover:bg-[#8B6D53] px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
              title="還原整站資料 (.json)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>還原資料</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImportBackup(file);
                    e.target.value = ''; // Clear value to allow re-uploading the same file
                  }
                }}
              />
            </label>
          )}

          <button
            id="export-pdf-excel-btn"
            onClick={onExport}
            className="flex items-center gap-1 bg-wood-dark hover:bg-wood-dark/90 text-white font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer font-medium"
            title="匯出 PDF 報表或 Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出報表</span>
          </button>
        </div>
      </div>

      {/* Tabs and Projects Bar */}
      <div className="bg-transparent px-6 pb-4 pt-1 flex items-center justify-between border-b gap-4 overflow-x-auto rounded-none" style={{ borderColor: 'rgba(139, 109, 83, 0.15)' }}>
        <div className="flex items-center gap-2 overflow-x-auto w-full">
          <span className="text-[11px] font-bold text-wood-dark whitespace-nowrap tracking-wider font-serif">
            現有專案：
          </span>
          <div className="flex items-center gap-1">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isEditing = editingProjectId === proj.id;

              if (isEditing) {
                return (
                  <input
                    key={proj.id}
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={() => handleFinishRename(proj.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFinishRename(proj.id);
                      } else if (e.key === 'Escape') {
                        setEditingProjectId(null);
                      }
                    }}
                    className="px-2 py-1 text-xs font-semibold bg-white border border-wood-light focus:outline-none focus:ring-1 focus:ring-wood-dark rounded shadow-2xs font-sans text-wood-dark w-32"
                    autoFocus
                  />
                );
              }

              return (
                <button
                  key={proj.id}
                  id={`project-tab-${proj.id}`}
                  onClick={() => onSelectProject(proj.id)}
                  onDoubleClick={() => handleStartRename(proj)}
                  className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer rounded-t-md ${
                    isActive
                      ? 'border-b-2 border-wood-dark text-wood-dark bg-stone-50/50 font-bold'
                      : 'border-b-2 border-transparent text-text-main/50 hover:text-text-main hover:opacity-100'
                  }`}
                  title="滑鼠雙擊可直接重新命名專案名稱"
                >
                  {proj.name}
                  {proj.templateType === 'checklist' && ' (純明細表)'}
                </button>
              );
            })}
          </div>

          {/* Active project action buttons (Delete) */}
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-line pl-3 py-0.5 whitespace-nowrap">
              <button
                type="button"
                onClick={() => onDeleteProject(activeProjectId)}
                className="text-[11px] font-semibold text-stone-400 hover:text-red-600 bg-red-50 hover:bg-red-100/50 px-2 py-1 rounded transition-colors cursor-pointer"
                title="刪除目前專案"
              >
                🗑️ 刪除專案
              </button>
            </div>
          )}

          {/* Quick inline prompt triggers */}
          {showAddPrompt ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-3 pl-3 border-l border-line bg-stone-50/80 p-2 rounded-lg border border-dashed border-line ml-3 whitespace-nowrap">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="輸入專案名稱..."
                className="bg-white border border-line rounded px-2 py-1 text-xs focus:outline-none focus:border-wood-light w-36 font-semibold"
                required
                autoFocus
              />
              <div className="flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-1 cursor-pointer font-medium text-stone-600">
                  <input
                    type="radio"
                    name="newProjTemplate"
                    checked={newProjectTemplate === 'diagram'}
                    onChange={() => setNewProjectTemplate('diagram')}
                    className="accent-wood-dark"
                  />
                  <span>🗺️ 互動圖面版</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer font-medium text-stone-600">
                  <input
                    type="radio"
                    name="newProjTemplate"
                    checked={newProjectTemplate === 'checklist'}
                    onChange={() => setNewProjectTemplate('checklist')}
                    className="accent-wood-dark"
                  />
                  <span>📋 純明細表版</span>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-wood-dark text-white rounded text-[11px] font-bold hover:bg-wood-dark/95 cursor-pointer"
                >
                  確認建立
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPrompt(false)}
                  className="px-2 py-1 bg-white text-text-main/70 border border-line rounded text-[11px] hover:bg-line cursor-pointer"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button
              id="show-add-project-btn"
              onClick={() => {
                setNewProjectTemplate('diagram');
                setShowAddPrompt(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-wood-light/60 text-xs font-semibold text-wood-dark/80 hover:text-wood-dark hover:bg-wood-light/10 transition-colors whitespace-nowrap cursor-pointer ml-4"
            >
              <Plus className="w-3.5 h-3.5" />
              新增專案
            </button>
          )}
        </div>

        {/* Sync hint */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-wood-dark/60 whitespace-nowrap bg-bg-paper px-2.5 py-1 rounded-full border border-line flex-shrink-0">
          <Sparkles className="w-3 h-3 text-wood-light" />
          <span>任何擁有此連結者皆可同步編輯，變更會即時發佈。</span>
        </div>
      </div>
    </header>
  );
}
