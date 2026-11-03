import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Smartphone,
  KeyRound,
  FolderTree,
  Shield,
  RotateCcw,
  FileText,
  Layers,
  Sparkles,
  QrCode,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import {
  USER_MANUAL_DATA,
  USER_MANUAL_CATEGORIES,
  ManualSection,
} from '../data/userManual';
import { CURRENT_APP_VERSION } from '../utils/version';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Smartphone,
  KeyRound,
  FolderTree,
  Shield,
  RotateCcw,
  FileText,
  Layers,
  Sparkles,
  QrCode,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  HelpCircle,
};

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    () => new Set(['pwa-install', 'init-and-recovery'])
  );

  const filteredSections = useMemo(() => {
    let list = USER_MANUAL_DATA;
    if (selectedCategory !== 'all') {
      list = list.filter(sec => sec.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(sec => {
        return (
          sec.title.toLowerCase().includes(q) ||
          sec.summary.toLowerCase().includes(q) ||
          sec.highlights.some(h => h.toLowerCase().includes(q)) ||
          sec.tags.some(t => t.toLowerCase().includes(q)) ||
          sec.details.some(d =>
            (d.subtitle && d.subtitle.toLowerCase().includes(q)) ||
            (d.steps && d.steps.some(s => s.toLowerCase().includes(q))) ||
            (d.note && d.note.toLowerCase().includes(q))
          )
        );
      });
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const toggleSection = (id: string) => {
    setExpandedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedSectionIds(new Set(filteredSections.map(s => s.id)));
  };

  const handleCollapseAll = () => {
    setExpandedSectionIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  SafeVault 使用手冊與操作指南
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                  {CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                完整收錄安裝、各功能操作技巧、離線同步與常見問答
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer shrink-0"
            title="關閉說明"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Category Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋使用說明、快捷鍵、同步、備份、復原、CSV、常見問答..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips Scrollbar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {USER_MANUAL_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Global Controls & Count Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>
              共 <strong className="text-slate-800">{filteredSections.length}</strong> 篇指南章節
              {searchQuery && `（符合「${searchQuery}」）`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandAll}
                className="hover:text-sky-700 font-medium transition cursor-pointer"
              >
                全部展開
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="hover:text-sky-700 font-medium transition cursor-pointer"
              >
                全部收合
              </button>
            </div>
          </div>
        </div>

        {/* Content Section List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredSections.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-medium text-slate-600">查無相關說明內容</p>
              <p className="text-xs text-slate-400">請嘗試更換搜尋關鍵字，或點選「全部說明」分類。</p>
            </div>
          ) : (
            filteredSections.map(sec => {
              const isExpanded = expandedSectionIds.has(sec.id);
              const IconComponent = ICON_MAP[sec.icon] || HelpCircle;

              return (
                <div
                  key={sec.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition overflow-hidden"
                >
                  {/* Card Header (Click to toggle) */}
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className="w-full p-4 flex items-start gap-3.5 text-left cursor-pointer hover:bg-slate-50/60 transition"
                  >
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4 text-sky-700" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          {sec.categoryLabel}
                        </span>
                        {sec.badge && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {sec.badge}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {sec.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {sec.summary}
                      </p>
                    </div>

                    <div className="p-1 text-slate-400 shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Card Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3.5 bg-slate-50/40 animate-fade-in text-xs">
                      {/* Highlights */}
                      {sec.highlights && sec.highlights.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <div className="text-[11px] font-bold text-slate-700">重點摘要：</div>
                          <ul className="space-y-1">
                            {sec.highlights.map((h, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-700 leading-relaxed">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Detailed Steps & Notes */}
                      {sec.details && sec.details.length > 0 && (
                        <div className="space-y-3 pt-1">
                          {sec.details.map((detail, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2">
                              {detail.subtitle && (
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                                  <span>{detail.subtitle}</span>
                                </div>
                              )}
                              {detail.steps && (
                                <ol className="space-y-1 list-decimal list-inside text-slate-600 pl-1 leading-relaxed">
                                  {detail.steps.map((st, sIdx) => (
                                    <li key={sIdx}>{st}</li>
                                  ))}
                                </ol>
                              )}
                              {detail.note && (
                                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/80 text-amber-900 flex items-start gap-1.5 text-[11px] leading-relaxed">
                                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>{detail.note}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Keywords / Tags */}
                      {sec.tags && sec.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-400">關鍵字:</span>
                          {sec.tags.map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSearchQuery(t)}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-200/60 hover:bg-sky-100 hover:text-sky-800 text-slate-600 rounded transition cursor-pointer"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>本手冊常態與 SafeVault 同步更新，本機隨時可離線查閱</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition cursor-pointer shadow-xs active:scale-95"
          >
            關閉手冊
          </button>
        </div>
      </div>
    </div>
  );
};
