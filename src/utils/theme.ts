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
  // 1. 韓系淡粉櫻花 (女生最愛 溫馨甜美)
  sakura: {
    id: 'sakura',
    name: '韓系淡粉櫻',
    subname: 'Sakura Blush',
    description: '溫柔韓系淡粉色調，像櫻花般甜美舒心，柔和乾淨不刺眼。',
    isDark: false,
    themeColor: '#fff5f7',
    palette: {
      previewBg: '#fff1f4',
      previewSurface: '#ffffff',
      previewBorder: '#fbcfe8',
      previewAccent: '#f43f5e',
      previewText: '#881337',
    },
    classes: {
      appRoot: 'bg-[#fff5f7] text-rose-950',
      appText: 'text-rose-950',
      appTextMuted: 'text-rose-600/80',
      headerBg: 'bg-white/90 backdrop-blur-md',
      headerBorder: 'border-pink-200/80',
      headerBtn: 'text-rose-700 bg-rose-50/90 hover:bg-rose-100 hover:text-rose-900 border-pink-200/70',
      headerBtnActive: 'bg-rose-500 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-pink-200/80 shadow-xs shadow-pink-100',
      cardSubtle: 'bg-rose-50/60',
      cardText: 'text-rose-950',
      cardTextMuted: 'text-rose-500',
      folderBg: 'bg-rose-50/70 hover:bg-rose-100/80',
      folderBorder: 'border-pink-200/80',
      folderExpandedBg: 'bg-rose-100 text-rose-900',
      primaryBtn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs',
      secondaryBtn: 'bg-white text-rose-700 border-pink-200 hover:bg-rose-50',
      accentText: 'text-rose-600',
      accentBadge: 'bg-rose-100/80 text-rose-800 border-rose-200',
      accentBorder: 'border-rose-400',
      inputBg: 'bg-white',
      inputBorder: 'border-pink-200 focus:ring-rose-400 focus:border-rose-400',
      inputText: 'text-rose-950',
      inputPlaceholder: 'placeholder:text-rose-300',
      tabBarBg: 'bg-white/95 backdrop-blur-md',
      tabBarBorder: 'border-pink-200/80',
      tabActive: 'text-rose-600 font-bold',
      tabInactive: 'text-rose-400/80 hover:text-rose-600',
      treeLine: 'border-pink-200',
    },
  },

  // 2. 溫暖烤奶燕麥 (奶茶色系 日系無印風)
  milktea: {
    id: 'milktea',
    name: '溫暖烤奶茶',
    subname: 'Warm Milk Tea',
    description: '日系燕麥與香醇烤奶茶色調，溫馨、質樸、護眼且舒適。',
    isDark: false,
    themeColor: '#faf6f0',
    palette: {
      previewBg: '#f7f2ea',
      previewSurface: '#ffffff',
      previewBorder: '#e6ded3',
      previewAccent: '#b45309',
      previewText: '#451a03',
    },
    classes: {
      appRoot: 'bg-[#faf6f0] text-[#3e2c1e]',
      appText: 'text-[#3e2c1e]',
      appTextMuted: 'text-[#876d5a]',
      headerBg: 'bg-[#fffdf9]/95 backdrop-blur-md',
      headerBorder: 'border-[#e8ded2]',
      headerBtn: 'text-[#5c4331] bg-[#f2e9dc] hover:bg-[#e7dacf] hover:text-[#2d1b0f] border-[#ded1c2]',
      headerBtnActive: 'bg-[#8d674b] text-white',
      cardBg: 'bg-[#ffffff]',
      cardBorder: 'border-[#e8ded2] shadow-xs shadow-[#ede4d8]',
      cardSubtle: 'bg-[#f7f2ea]',
      cardText: 'text-[#3e2c1e]',
      cardTextMuted: 'text-[#876d5a]',
      folderBg: 'bg-[#f5ede3]/80 hover:bg-[#ede1d3]',
      folderBorder: 'border-[#e5d9cc]',
      folderExpandedBg: 'bg-[#e8dcce] text-[#3e2c1e]',
      primaryBtn: 'bg-[#8d674b] hover:bg-[#7b573d] text-white shadow-xs',
      secondaryBtn: 'bg-[#ffffff] text-[#5c4331] border-[#ded1c2] hover:bg-[#f7f2ea]',
      accentText: 'text-[#9c6a43]',
      accentBadge: 'bg-[#ede3d5] text-[#5c402d] border-[#dacaba]',
      accentBorder: 'border-[#a87852]',
      inputBg: 'bg-[#ffffff]',
      inputBorder: 'border-[#ded1c2] focus:ring-[#a87852] focus:border-[#a87852]',
      inputText: 'text-[#3e2c1e]',
      inputPlaceholder: 'placeholder:text-[#b8a494]',
      tabBarBg: 'bg-[#fffdfa]/95 backdrop-blur-md',
      tabBarBorder: 'border-[#e8ded2]',
      tabActive: 'text-[#8d674b] font-bold',
      tabInactive: 'text-[#9e8876] hover:text-[#5c4331]',
      treeLine: 'border-[#ded1c2]',
    },
  },

  // 3. 清新翠綠抹茶 (女生森林系 舒緩自然)
  matcha: {
    id: 'matcha',
    name: '清新翠玉綠',
    subname: 'Fresh Matcha Green',
    description: '翠綠森林草木與若竹抹茶香，極致清爽護眼，滿滿自然朝氣。',
    isDark: false,
    themeColor: '#f3f8f4',
    palette: {
      previewBg: '#edf6f0',
      previewSurface: '#ffffff',
      previewBorder: '#c6e7d2',
      previewAccent: '#16a34a',
      previewText: '#14532d',
    },
    classes: {
      appRoot: 'bg-[#f3f8f4] text-[#14532d]',
      appText: 'text-[#14532d]',
      appTextMuted: 'text-[#2e7d52]',
      headerBg: 'bg-white/95 backdrop-blur-md',
      headerBorder: 'border-[#cce8d5]',
      headerBtn: 'text-[#1d633b] bg-[#e3f2e8] hover:bg-[#d2ebd9] hover:text-[#0f3d20] border-[#c2e4cc]',
      headerBtnActive: 'bg-[#15803d] text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-[#cce8d5] shadow-xs shadow-[#d8eedf]',
      cardSubtle: 'bg-[#edf7f1]',
      cardText: 'text-[#14532d]',
      cardTextMuted: 'text-[#367c55]',
      folderBg: 'bg-[#e4f3e9]/70 hover:bg-[#d3ebd9]',
      folderBorder: 'border-[#c6e6d0]',
      folderExpandedBg: 'bg-[#d2ebd9] text-[#0f3d20]',
      primaryBtn: 'bg-[#16a34a] hover:bg-[#15803d] text-white shadow-xs',
      secondaryBtn: 'bg-white text-[#1d633b] border-[#c2e4cc] hover:bg-[#edf7f1]',
      accentText: 'text-[#15803d]',
      accentBadge: 'bg-[#def1e4] text-[#14532d] border-[#bfe2cb]',
      accentBorder: 'border-[#22c55e]',
      inputBg: 'bg-white',
      inputBorder: 'border-[#c2e4cc] focus:ring-[#22c55e] focus:border-[#22c55e]',
      inputText: 'text-[#14532d]',
      inputPlaceholder: 'placeholder:text-[#82b896]',
      tabBarBg: 'bg-white/95 backdrop-blur-md',
      tabBarBorder: 'border-[#cce8d5]',
      tabActive: 'text-[#15803d] font-bold',
      tabInactive: 'text-[#4e916b] hover:text-[#14532d]',
      treeLine: 'border-[#c2e4cc]',
    },
  },

  // 4. 晴空澄淨淡藍 (清爽天藍系 乾淨通透)
  sky: {
    id: 'sky',
    name: '晴空澄淨藍',
    subname: 'Pure Sky Blue',
    description: '蔚藍晴空般的輕盈通透淡藍，視覺純淨無負擔，工作心情開朗。',
    isDark: false,
    themeColor: '#f0f7ff',
    palette: {
      previewBg: '#e8f3ff',
      previewSurface: '#ffffff',
      previewBorder: '#bfdbfe',
      previewAccent: '#0284c7',
      previewText: '#0c4a6e',
    },
    classes: {
      appRoot: 'bg-[#f0f7ff] text-sky-950',
      appText: 'text-sky-950',
      appTextMuted: 'text-sky-600',
      headerBg: 'bg-white/95 backdrop-blur-md',
      headerBorder: 'border-sky-200/80',
      headerBtn: 'text-sky-700 bg-sky-50/90 hover:bg-sky-100 hover:text-sky-900 border-sky-200/70',
      headerBtnActive: 'bg-sky-500 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-sky-200/80 shadow-xs shadow-sky-100',
      cardSubtle: 'bg-sky-50/60',
      cardText: 'text-sky-950',
      cardTextMuted: 'text-sky-500',
      folderBg: 'bg-sky-50/70 hover:bg-sky-100/80',
      folderBorder: 'border-sky-200/80',
      folderExpandedBg: 'bg-sky-100 text-sky-900',
      primaryBtn: 'bg-sky-500 hover:bg-sky-600 text-white shadow-xs',
      secondaryBtn: 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50',
      accentText: 'text-sky-600',
      accentBadge: 'bg-sky-100/80 text-sky-800 border-sky-200',
      accentBorder: 'border-sky-400',
      inputBg: 'bg-white',
      inputBorder: 'border-sky-200 focus:ring-sky-400 focus:border-sky-400',
      inputText: 'text-sky-950',
      inputPlaceholder: 'placeholder:text-sky-300',
      tabBarBg: 'bg-white/95 backdrop-blur-md',
      tabBarBorder: 'border-sky-200/80',
      tabActive: 'text-sky-600 font-bold',
      tabInactive: 'text-sky-400/80 hover:text-sky-600',
      treeLine: 'border-sky-200',
    },
  },

  // 5. 極簡冰川白 (經典預設)
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
      cardBorder: 'border-slate-200/90 shadow-xs',
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
      tabActive: 'text-sky-600 font-bold',
      tabInactive: 'text-slate-400 hover:text-slate-600',
      treeLine: 'border-slate-200',
    },
  },

  // 6. 黑曜暗夜黑 (OLED 真正純黑極致防窺與省電)
  obsidian: {
    id: 'obsidian',
    name: '黑曜暗夜黑',
    subname: 'Obsidian True Black',
    description: 'OLED 純黑像素防窺，夜間不刺眼，最大限度保護隱私與節省電力。',
    isDark: true,
    themeColor: '#090d16',
    palette: {
      previewBg: '#090d16',
      previewSurface: '#121826',
      previewBorder: '#1e293b',
      previewAccent: '#06b6d4',
      previewText: '#f8fafc',
    },
    classes: {
      appRoot: 'bg-[#090d16] text-slate-100',
      appText: 'text-slate-100',
      appTextMuted: 'text-slate-400',
      headerBg: 'bg-[#0f1422]/95 backdrop-blur-md',
      headerBorder: 'border-slate-800/80',
      headerBtn: 'text-slate-300 bg-[#161f33] hover:bg-[#1e2a44] hover:text-white border-slate-700/60',
      headerBtnActive: 'bg-cyan-500 text-slate-950 font-bold',
      cardBg: 'bg-[#121826]',
      cardBorder: 'border-slate-800/80 shadow-sm shadow-black/40',
      cardSubtle: 'bg-[#0d121d]',
      cardText: 'text-slate-100',
      cardTextMuted: 'text-slate-400',
      folderBg: 'bg-[#151c2d]/70 hover:bg-[#1b2438]',
      folderBorder: 'border-slate-800/80',
      folderExpandedBg: 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/50',
      primaryBtn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-xs',
      secondaryBtn: 'bg-[#1b2336] text-slate-200 border-slate-700 hover:bg-[#232d45]',
      accentText: 'text-cyan-400',
      accentBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/70',
      accentBorder: 'border-cyan-400',
      inputBg: 'bg-[#0d121d]',
      inputBorder: 'border-slate-700/80 focus:ring-cyan-400 focus:border-cyan-400',
      inputText: 'text-slate-100',
      inputPlaceholder: 'placeholder:text-slate-500',
      tabBarBg: 'bg-[#0f1422]/95 backdrop-blur-md',
      tabBarBorder: 'border-slate-800/80',
      tabActive: 'text-cyan-400 font-bold',
      tabInactive: 'text-slate-400 hover:text-slate-200',
      treeLine: 'border-slate-800',
    },
  },

  // 7. 太空鈦金灰 (鈦金屬工藝)
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

  // 8. 星艦深海藍 (海軍星空藍)
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
