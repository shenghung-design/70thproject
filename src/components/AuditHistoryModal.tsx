import React from 'react';
import { HistoryLog } from '../types';
import { X, History, RotateCcw, AlertTriangle, FileText, Check } from 'lucide-react';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: HistoryLog[];
  onRestoreItem: (log: HistoryLog) => void;
}

export default function AuditHistoryModal({
  isOpen,
  onClose,
  logs,
  onRestoreItem
}: AuditHistoryModalProps) {
  if (!isOpen) return null;

  // Format timestamps nicely
  const formatTime = (epoch: number) => {
    const d = new Date(epoch);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity font-sans">
      <div 
        id="audit-history-container"
        className="w-full max-w-lg bg-bg-paper rounded-xl border border-line shadow-xl overflow-hidden text-text-main flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-wood-dark px-5 py-3.5 flex justify-between items-center text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 opacity-90 animate-spin-reverse" />
            <span className="font-serif font-bold tracking-wider text-sm">操作歷程與刪除還原中心</span>
          </div>
          <button 
            id="close-history-modal-btn"
            onClick={onClose} 
            className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info notice banner */}
        <div className="bg-[#FAF9F6] border-b border-line px-5 py-3 flex items-start gap-2.5 text-xs text-wood-dark flex-shrink-0">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-wood-light flex-shrink-0" />
          <p className="leading-relaxed">
            此處記錄本專案下的所有新增、變更及刪除動作。若有人不慎刪除了排程項目，您可以在下方找到該紀錄，並點選 <b>「一鍵還原」</b> 恢復其全部內容與標註。
          </p>
        </div>

        {/* Logs list content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#FAF9F6]">
          {sortedLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-text-main/50 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-wood-light/50" />
              <span>目前尚無任何操作歷史紀錄</span>
            </div>
          ) : (
            sortedLogs.map((log) => {
              const isDelete = log.actionType === 'delete';
              const canRestore = isDelete && log.details;

              return (
                <div 
                  key={log.id} 
                  id={`log-item-${log.id}`}
                  className={`p-3.5 rounded-lg border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-shadow hover:shadow-2xs ${
                    isDelete 
                      ? 'border-red-200 bg-red-50/15' 
                      : log.actionType === 'restore'
                      ? 'border-accent-green/30 bg-accent-green/5'
                      : 'border-line'
                  }`}
                >
                  <div className="space-y-1">
                    {/* Log action tag + user */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.actionType === 'create' 
                          ? 'bg-accent-blue/15 text-[#6B858D]'
                          : log.actionType === 'update'
                          ? 'bg-wood-light/15 text-wood-dark'
                          : log.actionType === 'delete'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-accent-green/15 text-accent-green'
                      }`}>
                        {log.actionType === 'create' && '新增'}
                        {log.actionType === 'update' && '更新'}
                        {log.actionType === 'delete' && '刪除'}
                        {log.actionType === 'restore' && '還原'}
                      </span>
                      <span className="font-bold text-xs text-text-main">{log.userName}</span>
                      <span className="text-[10px] text-text-main/50 font-mono">{formatTime(log.timestamp)}</span>
                    </div>
                    {/* Log description */}
                    <p className="text-xs text-text-main/90 font-semibold">{log.description}</p>
                  </div>

                  {/* Action restore button */}
                  {canRestore && (
                    <button
                      type="button"
                      id={`restore-btn-${log.id}`}
                      onClick={() => {
                        onRestoreItem(log);
                        alert('還原成功！已恢復該項目的全部數據與地圖標註點。');
                      }}
                      className="self-start sm:self-center flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-wood-dark hover:bg-wood-dark/95 text-white text-[11px] font-semibold transition-all shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-95 flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      一鍵還原
                    </button>
                  )}
                  
                  {log.actionType === 'restore' && (
                    <span className="text-[10px] text-accent-green font-bold flex items-center gap-0.5 flex-shrink-0 self-start sm:self-center">
                      <Check className="w-3 h-3" />
                      已恢復
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF9F6] border-t border-line px-5 py-3 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-wood-dark text-white rounded-lg text-xs font-semibold hover:bg-wood-dark/95 transition-colors cursor-pointer shadow-xs"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
}
