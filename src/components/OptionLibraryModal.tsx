import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Save } from 'lucide-react';

interface OptionLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
  owners: string[];
  vendors: string[];
  statuses: string[];
  designers?: string[];
  defaultActiveTab?: 'departments' | 'owners' | 'vendors' | 'statuses' | 'designers';
  onSaveOptions: (type: 'departments' | 'owners' | 'vendors' | 'statuses' | 'designers', updatedList: string[]) => void;
}

export default function OptionLibraryModal({
  isOpen,
  onClose,
  departments,
  owners,
  vendors,
  statuses = [], // default fallback
  designers = [],
  defaultActiveTab = 'owners',
  onSaveOptions
}: OptionLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'departments' | 'owners' | 'vendors' | 'statuses' | 'designers'>('owners');
  const [newValue, setNewValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync active tab with default active tab prop when opening
  React.useEffect(() => {
    if (isOpen && defaultActiveTab) {
      // If defaultActiveTab is an object (due to accidental click event passing), fall back to 'owners'
      if (typeof defaultActiveTab === 'string') {
        setActiveTab(defaultActiveTab);
      } else {
        setActiveTab('owners');
      }
    }
    setError(null);
  }, [isOpen, defaultActiveTab]);

  if (!isOpen) return null;

  const getList = () => {
    if (activeTab === 'departments') return departments;
    if (activeTab === 'owners') return owners;
    if (activeTab === 'designers') return designers;
    if (activeTab === 'vendors') return vendors;
    return statuses;
  };

  const handleTabChange = (tab: 'departments' | 'owners' | 'vendors' | 'statuses' | 'designers') => {
    setActiveTab(tab);
    setEditingIndex(null);
    setDeleteConfirmIndex(null);
    setError(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = newValue.trim();
    if (!cleanVal) return;
    const currentList = getList();
    if (currentList.includes(cleanVal)) {
      setError('該選項已存在於列表中！');
      return;
    }
    const updatedList = [...currentList, cleanVal];
    onSaveOptions(activeTab, updatedList);
    setNewValue('');
    setError(null);
  };

  const handleStartEdit = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
    setDeleteConfirmIndex(null);
    setError(null);
  };

  const handleSaveEdit = (index: number) => {
    const cleanVal = editingValue.trim();
    if (!cleanVal) return;
    const currentList = [...getList()];
    
    // Check duplicates except itself
    if (currentList.some((v, i) => v === cleanVal && i !== index)) {
      setError('該選項已存在於列表中！');
      return;
    }

    currentList[index] = cleanVal;
    onSaveOptions(activeTab, currentList);
    setEditingIndex(null);
    setError(null);
  };

  const handleDelete = (index: number) => {
    const currentList = getList();
    const updatedList = currentList.filter((_, i) => i !== index);
    onSaveOptions(activeTab, updatedList);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
    setDeleteConfirmIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity font-sans">
      <div 
        id="option-library-container"
        className="w-full max-w-md bg-bg-paper rounded-xl border border-line shadow-xl overflow-hidden text-text-main"
      >
        {/* Modal Header */}
        <div className="bg-wood-dark px-5 py-3.5 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4.5 h-4.5 opacity-90" />
            <span className="font-serif font-bold tracking-wider text-sm">自訂下拉選單選項庫</span>
          </div>
          <button 
            id="close-options-modal-btn"
            onClick={onClose} 
            className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-line bg-[#FAF9F6] overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => handleTabChange('owners')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer text-center ${
              activeTab === 'owners' 
                ? 'border-wood-dark text-wood-dark bg-white' 
                : 'border-transparent text-text-main/65 hover:text-text-main hover:bg-bg-paper/40'
            }`}
          >
            負責人
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('departments')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer text-center ${
              activeTab === 'departments' 
                ? 'border-wood-dark text-wood-dark bg-white' 
                : 'border-transparent text-text-main/65 hover:text-text-main hover:bg-bg-paper/40'
            }`}
          >
            設計單位
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('designers')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer text-center ${
              activeTab === 'designers' 
                ? 'border-wood-dark text-wood-dark bg-white' 
                : 'border-transparent text-text-main/65 hover:text-text-main hover:bg-bg-paper/40'
            }`}
          >
            設計師
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('vendors')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer text-center ${
              activeTab === 'vendors' 
                ? 'border-wood-dark text-wood-dark bg-white' 
                : 'border-transparent text-text-main/65 hover:text-text-main hover:bg-bg-paper/40'
            }`}
          >
            廠商
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('statuses')}
            className={`flex-1 min-w-[70px] py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer text-center ${
              activeTab === 'statuses' 
                ? 'border-wood-dark text-wood-dark bg-white' 
                : 'border-transparent text-text-main/65 hover:text-text-main hover:bg-bg-paper/40'
            }`}
          >
            狀態選項
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-[11px] px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5 animate-fadeIn font-semibold">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Add Option Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`新增${
                activeTab === 'departments' 
                  ? '設計單位' 
                  : activeTab === 'designers'
                  ? '設計師'
                  : activeTab === 'owners' 
                  ? '負責人' 
                  : activeTab === 'vendors' 
                  ? '廠商' 
                  : '狀態'
              }選項...`}
              className="flex-1 bg-white border border-line rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-wood-dark focus:border-wood-dark font-medium"
              required
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-wood-dark hover:bg-wood-dark/95 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              新增
            </button>
          </form>

          {/* Current Options List */}
          <div className="max-h-60 overflow-y-auto border border-line rounded-lg bg-white/70 divide-y divide-line">
            {getList().length === 0 ? (
              <div className="p-8 text-center text-xs text-text-main/60 font-medium">
                目前尚無設定任何選項
              </div>
            ) : (
              getList().map((item, index) => (
                <div key={index} className="flex items-center justify-between px-3 py-2 text-xs">
                  {editingIndex === index ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 bg-white border border-wood-dark rounded-md px-2 py-1 text-xs focus:outline-none font-medium"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="p-1 text-accent-green hover:bg-accent-green/10 rounded cursor-pointer"
                        title="確認儲存"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-text-main">{item}</span>
                  )}

                  {editingIndex !== index && (
                    <div className="flex items-center gap-1">
                      {deleteConfirmIndex === index ? (
                        <div className="flex items-center gap-1 bg-red-50 px-1 py-0.5 rounded border border-red-200">
                          <span className="text-[10px] text-red-600 font-bold px-0.5">確認？</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(index)}
                            className="p-0.5 text-red-600 hover:bg-red-100 rounded cursor-pointer"
                            title="確認刪除"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmIndex(null)}
                            className="p-0.5 text-stone-500 hover:bg-stone-100 rounded cursor-pointer"
                            title="取消"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index, item)}
                            className="p-1 text-wood-light hover:text-wood-dark hover:bg-bg-paper/85 rounded transition-colors cursor-pointer"
                            title="編輯選項名稱"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmIndex(index)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="刪除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t border-line px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-wood-dark text-white rounded-lg text-xs font-semibold hover:bg-wood-dark/95 transition-colors cursor-pointer shadow-xs"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
}
