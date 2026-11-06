import { ThemeId } from '../types/vault';
export type { ThemeId };

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  subname: string;
  description: string;
  isDark: boolean;
  themeColor: string; // for <meta name="theme-color"> on iOS status bar & Android
  palette: {
    previewBg: string;
    previewSurface: string;
    previewBorder: string;
    previewAccent: string;
    previewText: string;
  };
  classes: {
    // App root container
    appRoot: string;
    appText: string;
    appTextMuted: string;
    // Header
    headerBg: string;
    headerBorder: string;
    headerBtn: string;
    headerBtnActive: string;
    // Cards
    cardBg: string;
    cardBorder: string;
    cardSubtle: string;
    cardText: string;
    cardTextMuted: string;
    // Category Folder
    folderBg: string;
    folderBorder: string;
    folderExpandedBg: string;
    // Accents & Buttons
    primaryBtn: string;
    secondaryBtn: string;
    accentText: string;
    accentBadge: string;
    accentBorder: string;
    // Search & Inputs
    inputBg: string;
    inputBorder: string;
    inputText: string;
    inputPlaceholder: string;
    // Bottom Tab Bar
    tabBarBg: string;
    tabBarBorder: string;
    tabActive: string;
    tabInactive: string;
    // Tree branch line
    treeLine: string;
  };
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  classic: {
    id: 'classic',
    name: '極簡冰川白',
    subname: 'Classic Glacier',
    description: '明亮通透、純淨簡約，經典日常辦公與生活必備風格。',
    isDark: false,
    themeColor: '#ffffff',
    palette: {
      previewBg: '#f8fafc',
      previewSurface: '#ffffff',
      previewBorder: '#e2e8f0',
      previewAccent: '#0ea5e9',
      previewText: '#0f172a',
    },
    classes: {
      appRoot: 'bg-slate-50 text-slate-900',
      appText: 'text-slate-900',
      appTextMuted: 'text-slate-500',
      headerBg: 'bg-white/95 backdrop-blur-md',
      headerBorder: 'border-slate-200/90',
      headerBtn: 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border-slate-200/60',
      headerBtnActive: 'bg-slate-900 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-200/90',
      cardSubtle: 'bg-slate-50/80',
      cardText: 'text-slate-900',
      cardTextMuted: 'text-slate-500',
      folderBg: 'bg-slate-50/70 hover:bg-slate-100/80',
      folderBorder: 'border-slate-200/90',
      folderExpandedBg: 'bg-amber-100 text-amber-800',
      primaryBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
      secondaryBtn: 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-100',
      accentText: 'text-sky-600',
      accentBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      accentBorder: 'border-sky-500',
      inputBg: 'bg-white',
      inputBorder: 'border-slate-200/90 focus:ring-sky-500',
      inputText: 'text-slate-900',
      inputPlaceholder: 'placeholder:text-slate-400',
      tabBarBg: 'bg-white/95 backdrop-blur-md',
      tabBarBorder: 'border-slate-200/90',
      tabActive: 'text-slate-900 font-bold',
      tabInactive: 'text-slate-500 hover:text-slate-800',
      treeLine: 'border-slate-200',
    },
  },
  obsidian: {
    id: 'obsidian',
    name: '黑曜暗夜黑',
    subname: 'Obsidian Cyber',
    description: '深邃高對比極黑，OLED 螢幕超省電、高防窺性與極客冷酷美學。',
    isDark: true,
    themeColor: '#090d16',
    palette: {
      previewBg: '#090d16',
      previewSurface: '#121927',
      previewBorder: '#1e293b',
      previewAccent: '#06b6d4',
      previewText: '#f8fafc',
    },
    classes: {
      appRoot: 'bg-[#090d16] text-slate-100',
      appText: 'text-slate-100',
      appTextMuted: 'text-slate-400',
      headerBg: 'bg-[#0f172a]/95 backdrop-blur-md',
      headerBorder: 'border-slate-800/90',
      headerBtn: 'text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white border-slate-700/60',
      headerBtnActive: 'bg-cyan-500 text-slate-950 font-bold',
      cardBg: 'bg-[#121927]',
      cardBorder: 'border-slate-800/90 shadow-sm shadow-black/40',
      cardSubtle: 'bg-[#0b111d]',
      cardText: 'text-slate-100',
      cardTextMuted: 'text-slate-400',
      folderBg: 'bg-[#131d2f]/70 hover:bg-[#1a273e]',
      folderBorder: 'border-slate-800',
      folderExpandedBg: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50',
      primaryBtn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-xs',
      secondaryBtn: 'bg-[#1a2438] text-slate-200 border-slate-700 hover:bg-[#22304a]',
      accentText: 'text-cyan-400',
      accentBadge: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60',
      accentBorder: 'border-cyan-400',
      inputBg: 'bg-[#0f1728]',
      inputBorder: 'border-slate-700/80 focus:ring-cyan-400 focus:border-cyan-400',
      inputText: 'text-slate-100',
      inputPlaceholder: 'placeholder:text-slate-500',
      tabBarBg: 'bg-[#0f172a]/95 backdrop-blur-md',
      tabBarBorder: 'border-slate-800',
      tabActive: 'text-cyan-400 font-bold',
      tabInactive: 'text-slate-400 hover:text-slate-200',
      treeLine: 'border-slate-700',
    },
  },
  titanium: {
    id: 'titanium',
    name: '太空鈦金灰',
    subname: 'Titanium Brushed',
    description: 'Apple 鈦金屬工藝靈感，沉穩霧面金屬灰階，奢華而內斂。',
    isDark: true,
    themeColor: '#1a1b1e',
    palette: {
      previewBg: '#18191c',
      previewSurface: '#222328',
      previewBorder: '#383a42',
      previewAccent: '#d4af37',
      previewText: '#f3f4f6',
    },
    classes: {
      appRoot: 'bg-[#16171a] text-stone-100',
      appText: 'text-stone-100',
      appTextMuted: 'text-stone-400',
      headerBg: 'bg-[#1f2025]/95 backdrop-blur-md',
      headerBorder: 'border-stone-700/70',
      headerBtn: 'text-stone-300 bg-[#282a30] hover:bg-[#34363e] hover:text-white border-stone-700/60',
      headerBtnActive: 'bg-amber-400 text-stone-950 font-bold',
      cardBg: 'bg-[#212328]',
      cardBorder: 'border-stone-700/60 shadow-sm shadow-black/30',
      cardSubtle: 'bg-[#1a1b1f]',
      cardText: 'text-stone-100',
      cardTextMuted: 'text-stone-400',
      folderBg: 'bg-[#26282f]/70 hover:bg-[#2d3038]',
      folderBorder: 'border-stone-700/70',
      folderExpandedBg: 'bg-amber-950/60 text-amber-300 border border-amber-800/40',
      primaryBtn: 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xs',
      secondaryBtn: 'bg-[#2c2e35] text-stone-200 border-stone-700 hover:bg-[#383a43]',
      accentText: 'text-amber-400',
      accentBadge: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
      accentBorder: 'border-amber-400',
      inputBg: 'bg-[#1c1d22]',
      inputBorder: 'border-stone-700/80 focus:ring-amber-400 focus:border-amber-400',
      inputText: 'text-stone-100',
      inputPlaceholder: 'placeholder:text-stone-500',
      tabBarBg: 'bg-[#1f2025]/95 backdrop-blur-md',
      tabBarBorder: 'border-stone-700/80',
      tabActive: 'text-amber-400 font-bold',
      tabInactive: 'text-stone-400 hover:text-stone-200',
      treeLine: 'border-stone-700',
    },
  },
  emerald: {
    id: 'emerald',
    name: '幽谷翠玉綠',
    subname: 'Emerald Matrix',
    description: '深邃高山墨玉綠與電漿薄荷光澤，極具資安金庫專屬防護儀式感。',
    isDark: true,
    themeColor: '#051611',
    palette: {
      previewBg: '#051611',
      previewSurface: '#0b261f',
      previewBorder: '#144639',
      previewAccent: '#10b981',
      previewText: '#ecfdf5',
    },
    classes: {
      appRoot: 'bg-[#051611] text-emerald-50',
      appText: 'text-emerald-50',
      appTextMuted: 'text-emerald-300/70',
      headerBg: 'bg-[#08221b]/95 backdrop-blur-md',
      headerBorder: 'border-emerald-900/80',
      headerBtn: 'text-emerald-200 bg-[#0f342b] hover:bg-[#16493c] hover:text-white border-emerald-800/60',
      headerBtnActive: 'bg-emerald-500 text-slate-950 font-bold',
      cardBg: 'bg-[#0c2a22]',
      cardBorder: 'border-emerald-900/70 shadow-sm shadow-black/40',
      cardSubtle: 'bg-[#071c16]',
      cardText: 'text-emerald-50',
      cardTextMuted: 'text-emerald-300/70',
      folderBg: 'bg-[#0f3329]/70 hover:bg-[#154437]',
      folderBorder: 'border-emerald-900/80',
      folderExpandedBg: 'bg-emerald-950 text-emerald-300 border border-emerald-700/50',
      primaryBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-xs',
      secondaryBtn: 'bg-[#123b30] text-emerald-200 border-emerald-800 hover:bg-[#194e40]',
      accentText: 'text-emerald-400',
      accentBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70',
      accentBorder: 'border-emerald-400',
      inputBg: 'bg-[#071f18]',
      inputBorder: 'border-emerald-800/80 focus:ring-emerald-400 focus:border-emerald-400',
      inputText: 'text-emerald-50',
      inputPlaceholder: 'placeholder:text-emerald-600',
      tabBarBg: 'bg-[#08221b]/95 backdrop-blur-md',
      tabBarBorder: 'border-emerald-900/80',
      tabActive: 'text-emerald-400 font-bold',
      tabInactive: 'text-emerald-400/60 hover:text-emerald-200',
      treeLine: 'border-emerald-800',
    },
  },
  midnight: {
    id: 'midnight',
    name: '星艦深海藍',
    subname: 'Midnight Navy',
    description: '深邃皇家深藍與亮電藍星芒，科技金融銀行級信賴感與尊貴格調。',
    isDark: true,
    themeColor: '#070f26',
    palette: {
      previewBg: '#070f26',
      previewSurface: '#0f1d45',
      previewBorder: '#1c3272',
      previewAccent: '#38bdf8',
      previewText: '#f0f9ff',
    },
    classes: {
      appRoot: 'bg-[#070f26] text-sky-50',
      appText: 'text-sky-50',
      appTextMuted: 'text-sky-300/70',
      headerBg: 'bg-[#0c183a]/95 backdrop-blur-md',
      headerBorder: 'border-indigo-900/80',
      headerBtn: 'text-sky-200 bg-[#142452] hover:bg-[#1c3270] hover:text-white border-indigo-800/60',
      headerBtnActive: 'bg-sky-400 text-slate-950 font-bold',
      cardBg: 'bg-[#0e1b3f]',
      cardBorder: 'border-indigo-900/70 shadow-sm shadow-black/40',
      cardSubtle: 'bg-[#08112d]',
      cardText: 'text-sky-50',
      cardTextMuted: 'text-sky-300/70',
      folderBg: 'bg-[#12224e]/70 hover:bg-[#182e68]',
      folderBorder: 'border-indigo-900/80',
      folderExpandedBg: 'bg-sky-950 text-sky-300 border border-sky-700/50',
      primaryBtn: 'bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold shadow-xs',
      secondaryBtn: 'bg-[#162758] text-sky-200 border-indigo-800 hover:bg-[#1e3575]',
      accentText: 'text-sky-400',
      accentBadge: 'bg-sky-950/80 text-sky-300 border-sky-800/70',
      accentBorder: 'border-sky-400',
      inputBg: 'bg-[#091330]',
      inputBorder: 'border-indigo-800/80 focus:ring-sky-400 focus:border-sky-400',
      inputText: 'text-sky-50',
      inputPlaceholder: 'placeholder:text-sky-600',
      tabBarBg: 'bg-[#0c183a]/95 backdrop-blur-md',
      tabBarBorder: 'border-indigo-900/80',
      tabActive: 'text-sky-400 font-bold',
      tabInactive: 'text-sky-300/60 hover:text-sky-100',
      treeLine: 'border-indigo-800',
    },
  },
};

export function getThemeConfig(themeId?: string): ThemeDefinition {
  if (themeId && themeId in THEMES) {
    return THEMES[themeId as ThemeId];
  }
  return THEMES.classic;
}

// 實時同步 iOS / Android 系統狀態列與頂部導覽 theme-color
export function applyThemeColorToDOM(themeInput: ThemeDefinition | ThemeId | string): void {
  if (typeof document === 'undefined') return;
  const theme = typeof themeInput === 'object' ? themeInput : getThemeConfig(themeInput);

  // 1. 同步 <meta name="theme-color">
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme.themeColor);

  // 2. 同步 body 預設背景色 (防止 iOS 上下滑動回彈出現白色漏底)
  document.body.style.backgroundColor = theme.palette.previewBg;
  if (theme.isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
