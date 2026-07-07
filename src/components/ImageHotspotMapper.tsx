import React, { useRef, useState, useEffect } from 'react';
import { Hotspot } from '../types';
import { 
  Image as ImageIcon, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit2, 
  Upload, 
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Move,
  Target,
  RefreshCw
} from 'lucide-react';

const giftboxDefaultImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="100%" height="100%" style="background:%23F8FAFC;"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="%23CBD5E1" stroke-width="1" opacity="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /><circle cx="200" cy="150" r="100" fill="%23E6ECE9" opacity="0.6"/><circle cx="1000" cy="500" r="150" fill="%23FAF2D3" opacity="0.5"/><g transform="translate(150, 80)"><path d="M 450 120 L 750 250 L 450 380 L 150 250 Z" fill="%23E6ECE9" stroke="%235E8075" stroke-width="4" stroke-linejoin="round"/><path d="M 150 250 L 150 350 L 450 480 L 450 380 Z" fill="%23D4E2D9" stroke="%235E8075" stroke-width="4" stroke-linejoin="round"/><path d="M 450 380 L 450 480 L 750 350 L 750 250 Z" fill="%23C2D3C8" stroke="%235E8075" stroke-width="4" stroke-linejoin="round"/><path d="M 140 240 L 760 240 M 450 110 L 450 490" stroke="%231E3F35" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.4"/><path d="M 410 137 L 590 217 L 410 297 L 230 217 Z" fill="%23FAF2D3" stroke="%23E97D45" stroke-width="2" opacity="0.9"/><circle cx="410" cy="217" r="14" fill="%23E97D45" /><text x="410" y="221" font-family="'Noto Sans TC', sans-serif" font-weight="bold" font-size="12" fill="%23FFFFFF" text-anchor="middle">70</text><path d="M 410 217 Q 350 180 320 200" fill="none" stroke="%231E3F35" stroke-width="2"/><circle cx="320" cy="200" r="4" fill="%235E8075" /><circle cx="335" cy="193" r="3" fill="%235E8075" /><circle cx="355" cy="191" r="3" fill="%235E8075" /><g transform="translate(480, -30)" opacity="0.85"><rect x="0" y="0" width="160" height="110" rx="10" fill="%23FFF" stroke="%235E8075" stroke-width="3"/><path d="M 10 55 L 150 55" stroke="%23E97D45" stroke-width="2" stroke-dasharray="4,3"/><circle cx="80" cy="55" r="18" fill="%23FAF2D3" stroke="%23E97D45" stroke-width="1.5"/><text x="80" y="59" font-family="sans-serif" font-size="11" fill="%23E97D45" font-weight="bold" text-anchor="middle">B1</text><text x="80" y="-12" font-family="'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="%231E3F35" text-anchor="middle">B1 餅乾包裝</text></g><g transform="translate(680, 180)" opacity="0.85"><rect x="0" y="0" width="140" height="90" rx="8" fill="%23FFF" stroke="%235E8075" stroke-width="3"/><circle cx="70" cy="45" r="22" fill="%23FAF2D3" stroke="%235E8075" stroke-dasharray="3,2" stroke-width="1.5"/><circle cx="70" cy="45" r="12" fill="%23E97D45" opacity="0.8"/><text x="70" y="115" font-family="'Noto Sans TC', sans-serif" font-size="13" font-weight="bold" fill="%231E3F35" text-anchor="middle">D1 吸塑底托</text></g><path d="M 450 320 L 520 370 L 580 370" fill="none" stroke="%23E97D45" stroke-width="1.5" stroke-dasharray="3,3" /><circle cx="450" cy="320" r="4" fill="%23E97D45" /><rect x="580" y="350" width="140" height="36" rx="6" fill="%23FFF3EC" stroke="%23E97D45" stroke-width="1.5"/><text x="650" y="372" font-family="'Noto Sans TC', sans-serif" font-size="11" font-weight="bold" fill="%23E97D45" text-anchor="middle">C1 封口貼紙</text><path d="M 230 180 L 100 120 L 50 120" fill="none" stroke="%235E8075" stroke-width="1.5" stroke-dasharray="3,3" /><circle cx="230" cy="180" r="4" fill="%235E8075" /><rect x="-110" y="100" width="150" height="36" rx="6" fill="%23E6ECE9" stroke="%235E8075" stroke-width="1.5"/><text x="-35" y="122" font-family="'Noto Sans TC', sans-serif" font-size="11" font-weight="bold" fill="%231E3F35" text-anchor="middle">A1 禮盒外蓋</text></g><text x="50" y="60" font-family="'Noto Serif TC', serif" font-weight="bold" font-size="22" fill="%231E3F35" letter-spacing="2">勝宏 70 週年禮盒示意圖</text><text x="50" y="90" font-family="'Noto Sans TC', sans-serif" font-size="12" fill="%235E8075">點擊下方圖面即可新增排程項目；拖曳現有圓點可任意調整其位置。</text></svg>`;

interface ImageHotspotMapperProps {
  hotspots: Hotspot[];
  projectImageSrc: string;
  projectId: string;
  diagramName: string;
  onUpdateDiagramName: (newName: string) => void;
  onAddHotspot: (code: string, name: string, x: number, y: number) => void;
  onEditHotspot: (hotspotId: string, updatedCode: string, updatedName: string) => void;
  onDeleteHotspot: (hotspotId: string) => void;
  onMoveHotspot: (hotspotId: string, x: number, y: number) => void;
  onUpdateImage: (newBase64: string) => void;
}

export default function ImageHotspotMapper({
  hotspots,
  projectImageSrc,
  projectId,
  diagramName,
  onUpdateDiagramName,
  onAddHotspot,
  onEditHotspot,
  onDeleteHotspot,
  onMoveHotspot,
  onUpdateImage
}: ImageHotspotMapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [clickCoord, setClickCoord] = useState<{ x: number; y: number } | null>(null);
  const [hotspotCode, setHotspotCode] = useState('');
  const [hotspotName, setHotspotName] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [editingHotspot, setEditingHotspot] = useState<Hotspot | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Rename title states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(diagramName);

  // Sync temp title on project changes
  useEffect(() => {
    setTempTitle(diagramName);
  }, [diagramName]);

  const handleFinishEditingTitle = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle.trim() !== diagramName) {
      onUpdateDiagramName(tempTitle.trim());
    }
  };

  // Panning & Zooming board states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<'pointer' | 'pan'>('pointer');
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [boardDragStart, setBoardDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Draggable hotspots states
  const [draggedHotspotId, setDraggedHotspotId] = useState<string | null>(null);
  const [hotspotDragStart, setHotspotDragStart] = useState<{
    clientX: number;
    clientY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Sync prop hotspots to a local layout array for silky-smooth drag response
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(hotspots);
  useEffect(() => {
    setLocalHotspots(hotspots);
  }, [hotspots]);

  // Reset zoom & pan when project changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMode('pointer');
  }, [projectId]);

  // Fallback to our generated giftbox schematic if none is present
  const imageSource = projectImageSrc;

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (editingHotspot) return; // Ignore if editing
    if (mode === 'pan') return; // Ignore click in panning mode
    if (draggedHotspotId) return; // Ignore click if dragging hotspot
    if (!containerRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Open hotspot creation prompt
    setClickCoord({ x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) });
    
    // Auto-suggest next sequential code
    const existingCodes = hotspots.map(h => h.code);
    let nextNum = 1;
    let nextCode = `A${nextNum}`;
    while (existingCodes.includes(nextCode)) {
      nextNum++;
      nextCode = `A${nextNum}`;
    }
    setHotspotCode(nextCode);
    setHotspotName('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickCoord || !hotspotCode.trim() || !hotspotName.trim()) return;

    onAddHotspot(
      hotspotCode.trim().toUpperCase(),
      hotspotName.trim(),
      clickCoord.x,
      clickCoord.y
    );

    setClickCoord(null);
    setHotspotCode('');
    setHotspotName('');
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotspot || !hotspotCode.trim() || !hotspotName.trim()) return;

    onEditHotspot(editingHotspot.id, hotspotCode.trim().toUpperCase(), hotspotName.trim());
    setEditingHotspot(null);
    setShowDeleteConfirm(false);
  };

  // Image Upload handlers
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請上傳正確的圖片格式！');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (typeof base64 !== 'string') return;
      onUpdateImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Board Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'pan' || zoom > 1) {
      if (e.target instanceof HTMLButtonElement || (e.target as HTMLElement).closest('button')) {
        return; // ignore button clicks
      }
      setIsDraggingBoard(true);
      setBoardDragStart({
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedHotspotId && hotspotDragStart && containerRef.current) {
      // Repositioning a hotspot
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - hotspotDragStart.clientX) / rect.width) * 100;
      const deltaY = ((e.clientY - hotspotDragStart.clientY) / rect.height) * 100;

      // Adjust delta by zoom level
      const newX = Math.max(0, Math.min(100, hotspotDragStart.initialX + deltaX / zoom));
      const newY = Math.max(0, Math.min(100, hotspotDragStart.initialY + deltaY / zoom));

      setLocalHotspots(prev => prev.map(h => 
        h.id === draggedHotspotId ? { ...h, x: parseFloat(newX.toFixed(1)), y: parseFloat(newY.toFixed(1)) } : h
      ));
    } else if (isDraggingBoard && boardDragStart) {
      // Panning board
      const deltaX = e.clientX - boardDragStart.x;
      const deltaY = e.clientY - boardDragStart.y;
      setPan({
        x: boardDragStart.panX + deltaX,
        y: boardDragStart.panY + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    if (draggedHotspotId) {
      const draggedSpot = localHotspots.find(h => h.id === draggedHotspotId);
      if (draggedSpot) {
        onMoveHotspot(draggedSpot.id, draggedSpot.x, draggedSpot.y);
      }
      setDraggedHotspotId(null);
      setHotspotDragStart(null);
    }
    setIsDraggingBoard(false);
    setBoardDragStart(null);
  };

  const handleHotspotMouseDown = (e: React.MouseEvent, spot: Hotspot) => {
    e.stopPropagation();
    e.preventDefault();
    if (mode === 'pan') return; // Cannot drag pins in pan-board mode
    setDraggedHotspotId(spot.id);
    setHotspotDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: spot.x,
      initialY: spot.y
    });
  };

  // Zoom helpers
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.25));
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(1, prev - 0.25);
      if (next === 1) setPan({ x: 0, y: 0 }); // auto-center
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div id="image-hotspot-mapper-card" className="bg-white rounded-xl border border-line shadow-md overflow-hidden font-sans text-text-main h-full flex flex-col">
      {/* Title block */}
      <div className="bg-[#FAF9F6] border-b px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0" style={{ borderColor: '#6c7072' }}>
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleFinishEditingTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishEditingTitle();
                if (e.key === 'Escape') {
                  setIsEditingTitle(false);
                  setTempTitle(diagramName);
                }
              }}
              className="text-base font-bold text-text-main font-serif border border-wood-dark focus:outline-none bg-white px-2 py-0.5 rounded-md w-full max-w-sm shadow-inner"
              autoFocus
            />
          ) : (
            <h2 
              className={`text-base font-bold flex items-center gap-2 font-serif cursor-pointer hover:bg-stone-200/50 px-1.5 py-0.5 rounded transition-all select-none border border-transparent hover:border-wood-light/25 group ${
                !diagramName ? "text-stone-400" : "text-text-main"
              }`}
              onDoubleClick={() => {
                setIsEditingTitle(true);
                setTempTitle(diagramName || "");
              }}
              title="雙擊此處可以修改專案圖檔的名稱"
            >
              <span className="-ml-1.5">{diagramName || "雙點擊新增標題"}</span>
              <span className="text-[10px] text-wood-dark/40 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                (雙擊編輯)
              </span>
            </h2>
          )}
          <p className="text-xs text-text-main/70 mt-1">
            點擊或拖曳標註點定位；滑鼠拖曳背景可移動畫面，支援滑動調整放大縮小。
          </p>
          <p className="text-xs text-wood-dark font-medium mt-0.5">
            (建議上傳尺寸：1200 x 514 像素)
          </p>
        </div>
        
        {/* Stage controls & file triggers - Aligned perfectly to the right */}
        <div className="flex flex-col items-end gap-2 lg:ml-auto">
          {/* Level 1: Tool Selection */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-line bg-stone-50 p-1 text-xs gap-1 h-9 items-center">
              <button
                type="button"
                onClick={() => setMode('pointer')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer h-7 ${
                  mode === 'pointer' 
                    ? 'bg-wood-dark text-white shadow-xs' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="打點及拖移標點模式"
              >
                <Target className="w-3.5 h-3.5" />
                <span>打點標註</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('pan')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer h-7 ${
                  mode === 'pan' 
                    ? 'bg-wood-dark text-white shadow-xs' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="拖移示意圖畫面模式"
              >
                <Move className="w-3.5 h-3.5" />
                <span>拖移畫面</span>
              </button>
            </div>
          </div>

          {/* Level 2: Zoom and Change image file triggers */}
          <div className="flex items-center gap-2.5">
            {/* Zoom Actions */}
            <div className="flex items-center rounded-lg border border-line bg-stone-50 p-1 text-xs divide-x divide-stone-200 h-9">
              <div className="flex gap-0.5 pr-1 items-center">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="p-1 hover:bg-stone-200 rounded text-stone-600 disabled:opacity-40 cursor-pointer"
                  title="縮小示意圖"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-500 min-w-[36px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="p-1 hover:bg-stone-200 rounded text-stone-600 disabled:opacity-40 cursor-pointer"
                  title="放大示意圖"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 hover:bg-stone-200 rounded text-stone-500 pl-1 cursor-pointer ml-0.5"
                title="重設縮放與位置"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Change image file trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              id="upload-image-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-wood-light text-xs text-wood-dark hover:bg-wood-light/10 transition-colors cursor-pointer bg-white shadow-2xs h-7 font-semibold whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 flex-shrink-0" />
              <span>更換圖檔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-full bg-[#FAF9F6] flex items-center justify-center overflow-hidden select-none border-b border-line flex-grow ${
          isDragOver ? 'ring-2 ring-dashed ring-wood-dark bg-wood-light/5' : ''
        }`}
      >
        {/* Inner pan-zoom interactive board canvas wrapper */}
        <div
          className="relative w-full h-full select-none max-w-lg mx-auto"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDraggingBoard || draggedHotspotId ? 'none' : 'transform 150ms ease-out',
            cursor: draggedHotspotId ? 'grabbing' : mode === 'pan' ? (isDraggingBoard ? 'grabbing' : 'grab') : 'crosshair'
          }}
        >
          {imageSource ? (
            <img
              src={imageSource}
              alt="Gift Box Schematic"
              referrerPolicy="no-referrer"
              onClick={handleImageClick}
              className="w-full h-full object-contain select-none pointer-events-auto"
              draggable={false}
            />
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 text-wood-dark/50 hover:text-wood-dark transition-colors cursor-pointer w-full h-full"
            >
              <Plus className="w-12 h-12" />
              <span className="text-sm font-semibold">上傳圖檔</span>
            </button>
          )}

          {/* Hotspot Hot pins */}
          {localHotspots.map((spot) => {
            const isDragged = spot.id === draggedHotspotId;
            return (
              <div
                key={spot.id}
                id={`hotspot-pin-${spot.id}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-shadow ${
                  isDragged ? 'z-30 scale-110 shadow-lg' : ''
                }`}
                onMouseEnter={() => {
                  if (!draggedHotspotId) setActiveTooltip(spot.id);
                }}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {/* The Pin Trigger Button with static clean style (no pulse ring) */}
                <button
                  id={`hotspot-btn-${spot.id}`}
                  onMouseDown={(e) => handleHotspotMouseDown(e, spot)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (draggedHotspotId) return;
                    setEditingHotspot(spot);
                    setHotspotCode(spot.code);
                    setHotspotName(spot.name);
                    setShowDeleteConfirm(false);
                  }}
                  className={`relative w-7 h-7 bg-wood-dark text-white font-mono text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer hover:bg-wood-light transition-all active:scale-95 ${
                    isDragged ? 'cursor-grabbing ring-2 ring-wood-dark ring-offset-2' : ''
                  }`}
                >
                  {spot.code}
                </button>

                {/* Hover Tooltip Popup */}
                {activeTooltip === spot.id && !editingHotspot && !clickCoord && !draggedHotspotId && (
                  <div 
                    id={`hotspot-tooltip-${spot.id}`}
                    className="absolute left-1/2 bottom-9 -translate-x-1/2 z-20 bg-stone-900/90 text-stone-100 text-[10px] font-medium tracking-wide px-2.5 py-1 rounded shadow-lg whitespace-nowrap border border-stone-800 pointer-events-none transition-all flex items-center gap-1.5"
                  >
                    <span className="font-bold text-wood-light font-mono">[{spot.code}]</span>
                    <span>{spot.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dialog Panel 1: Create Hotspot */}
        {clickCoord && (
          <div className="absolute inset-0 z-30 bg-black/35 backdrop-blur-xs flex items-center justify-center p-4">
            <div 
              id="create-hotspot-form"
              className="w-full max-w-sm bg-bg-paper rounded-xl border border-wood-light shadow-xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2 text-wood-dark">
                <MapPin className="w-5 h-5" />
                <h3 className="font-bold text-sm">新增禮盒結構標註點 (x:{clickCoord.x}%, y:{clickCoord.y}%)</h3>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-wood-dark mb-1">專屬編號 (例如 A1, B1)</label>
                  <input
                    type="text"
                    value={hotspotCode}
                    onChange={(e) => setHotspotCode(e.target.value)}
                    className="w-full bg-white border border-line rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-wood-dark font-mono font-bold"
                    placeholder="如: A1, B2"
                    required
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-wood-dark mb-1">對應結構或包裝名稱</label>
                  <input
                    type="text"
                    value={hotspotName}
                    onChange={(e) => setHotspotName(e.target.value)}
                    className="w-full bg-white border border-line rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-wood-dark"
                    placeholder="如: 外盒包裝、內層餅乾袋"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setClickCoord(null)}
                    className="px-3 py-1.5 text-xs border border-line rounded text-text-main/80 hover:bg-line/40 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs bg-wood-dark text-white rounded hover:bg-wood-dark/95 flex items-center gap-1 transition-colors font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    確認新增
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dialog Panel 2: Edit or Delete Hotspot */}
        {editingHotspot && (
          <div className="absolute inset-0 z-30 bg-black/35 backdrop-blur-xs flex items-center justify-center p-4">
            <div 
              id="edit-hotspot-form"
              className="w-full max-w-sm bg-bg-paper rounded-xl border border-wood-light shadow-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center gap-2 text-wood-dark">
                  <Edit2 className="w-4.5 h-4.5" />
                  <h3 className="font-bold text-sm">編輯/刪除結構標註點</h3>
                </div>
                
                {/* Safe State-driven Custom Confirmation instead of dangerous confirm() inside sandbox iframe */}
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    id="delete-hotspot-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center gap-1 text-xs cursor-pointer font-bold"
                    title="刪除標註點"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>刪除標點</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-red-50 p-1.5 rounded border border-red-200 text-xs animate-fadeIn">
                    <span className="text-[10px] text-red-600 font-bold">確認刪除此標點？</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteHotspot(editingHotspot.id);
                        setEditingHotspot(null);
                        setShowDeleteConfirm(false);
                      }}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold transition-colors cursor-pointer"
                    >
                      確認
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-0.5 bg-white text-stone-600 border border-stone-200 text-[10px] rounded font-semibold transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-wood-dark mb-1">專屬編號</label>
                  <input
                    type="text"
                    value={hotspotCode}
                    onChange={(e) => setHotspotCode(e.target.value)}
                    className="w-full bg-white border border-line rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-wood-dark font-mono font-bold"
                    required
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-wood-dark mb-1">對應結構名稱</label>
                  <input
                    type="text"
                    value={hotspotName}
                    onChange={(e) => setHotspotName(e.target.value)}
                    className="w-full bg-white border border-line rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-wood-dark"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingHotspot(null);
                      setShowDeleteConfirm(false);
                    }}
                    className="px-3 py-1.5 text-xs border border-line rounded text-text-main/80 hover:bg-line/40 transition-colors"
                  >
                    返回
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs bg-wood-dark text-white rounded hover:bg-wood-dark/95 transition-colors font-semibold"
                  >
                    儲存修改
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Drag zone cue footer */}
      <div className="bg-[#FAF9F6] border-t border-line px-6 py-2.5 text-[11px] text-wood-dark/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-wood-light" />
          <span>滑鼠按住標註點可手動拖移至正確位置；拖曳圖片至示意區可更換禮盒設計稿。</span>
        </div>
        <div className="text-[10px] text-stone-400 font-medium">
          滾輪縮放：1.0x ~ 3.0x
        </div>
      </div>
    </div>
  );
}
