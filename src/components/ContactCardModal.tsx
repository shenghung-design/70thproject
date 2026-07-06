import React, { useState } from 'react';
import { Contact } from '../types';
import { X, Copy, Check, Phone, Smartphone, MessageSquare, User, Save } from 'lucide-react';

interface ContactCardModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContact: Contact) => void;
}

export default function ContactCardModal({ contact, isOpen, onClose, onSave }: ContactCardModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [lineId, setLineId] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  React.useEffect(() => {
    if (contact) {
      setName(contact.name);
      setCompanyPhone(contact.companyPhone || '');
      setMobile(contact.mobile || '');
      setLineId(contact.lineId || '');
      setIsEditing(false);
    }
  }, [contact, isOpen]);

  if (!isOpen || !contact) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...contact,
      name: name.trim() || '未命名聯絡人',
      companyPhone: companyPhone.trim(),
      mobile: mobile.trim(),
      lineId: lineId.trim()
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
      <div 
        id="contact-card-container"
        className="w-full max-w-md bg-bg-paper rounded-xl border border-line shadow-xl overflow-hidden font-sans text-text-main"
      >
        {/* Header Ribbon */}
        <div className="bg-wood-dark px-5 py-3.5 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 opacity-90" />
            <span className="font-serif font-bold tracking-wider text-sm">廠商聯絡資訊窗口</span>
          </div>
          <button 
            id="close-contact-modal-btn"
            onClick={onClose} 
            className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveSubmit} className="p-6 space-y-5">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-wood-dark">聯絡人姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-wood-dark focus:border-wood-dark font-medium"
                  placeholder="例如：陳經理"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-wood-dark">公司電話</label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-wood-dark focus:border-wood-dark font-mono"
                  placeholder="例如：02-2789-5566"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-wood-dark">手機號碼</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-wood-dark focus:border-wood-dark font-mono"
                  placeholder="例如：0912-345-678"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-wood-dark">LINE ID</label>
                <input
                  type="text"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-wood-dark focus:border-wood-dark font-mono"
                  placeholder="例如：line_id_123"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 rounded-lg border border-line text-xs font-medium text-text-main/80 hover:bg-line/45 transition-colors cursor-pointer bg-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-wood-dark text-white text-xs font-semibold hover:bg-wood-dark/95 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  儲存修改
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Card Intro */}
              <div className="flex items-center gap-4 pb-3 border-b border-line">
                <div className="w-12 h-12 rounded-full bg-wood-light/25 flex items-center justify-center text-wood-dark font-serif font-bold text-lg border border-wood-light/10">
                  {name ? name.substring(0, 1) : '👤'}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text-main font-serif">{name || '未填寫姓名'}</h3>
                  <p className="text-xs text-wood-dark/80 font-medium">勝宏集團 70週年合作廠商窗口</p>
                </div>
              </div>

              {/* Data Fields */}
              <div className="space-y-3">
                {/* Company Phone */}
                <div className="flex justify-between items-center bg-white/70 p-2.5 rounded-lg border border-line">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="w-4 h-4 text-wood-dark/80" />
                    <span className="text-wood-dark/60 w-16 text-xs font-bold">公司電話</span>
                    <span className="font-mono font-medium">{companyPhone || '未填寫'}</span>
                  </div>
                  {companyPhone && (
                    <button
                      type="button"
                      onClick={() => handleCopy(companyPhone, 'companyPhone')}
                      className="p-1.5 text-wood-light hover:text-wood-dark hover:bg-bg-paper rounded-md transition-all cursor-pointer border border-transparent hover:border-line"
                      title="複製電話"
                    >
                      {copiedField === 'companyPhone' ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Mobile */}
                <div className="flex justify-between items-center bg-white/70 p-2.5 rounded-lg border border-line">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Smartphone className="w-4 h-4 text-wood-dark/80" />
                    <span className="text-wood-dark/60 w-16 text-xs font-bold">手機號碼</span>
                    <span className="font-mono font-medium">{mobile || '未填寫'}</span>
                  </div>
                  {mobile && (
                    <button
                      type="button"
                      onClick={() => handleCopy(mobile, 'mobile')}
                      className="p-1.5 text-wood-light hover:text-wood-dark hover:bg-bg-paper rounded-md transition-all cursor-pointer border border-transparent hover:border-line"
                      title="複製手機"
                    >
                      {copiedField === 'mobile' ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* LINE ID */}
                <div className="flex justify-between items-center bg-white/70 p-2.5 rounded-lg border border-line">
                  <div className="flex items-center gap-2.5 text-sm">
                    <MessageSquare className="w-4 h-4 text-wood-dark/80" />
                    <span className="text-wood-dark/60 w-16 text-xs font-bold">LINE ID</span>
                    <span className="font-mono font-medium">{lineId || '未填寫'}</span>
                  </div>
                  {lineId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(lineId, 'lineId')}
                      className="p-1.5 text-wood-light hover:text-wood-dark hover:bg-bg-paper rounded-md transition-all cursor-pointer border border-transparent hover:border-line"
                      title="複製 LINE ID"
                    >
                      {copiedField === 'lineId' ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-1.5 rounded-lg bg-wood-light text-white text-xs font-semibold hover:bg-wood-dark hover:scale-[1.02] active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  編輯聯絡人資訊
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
