/**
 * BI ERP - Theme hook (from erp-api1 themes)
 */
import { useCallback, useEffect, useState } from 'react';

const THEMES = [
  { id: 'ocean-dark', label: 'المحيط المظلم', default: true },
  { id: 'slate-light', label: 'المكتب التنفيذي' },
  { id: 'royal-navy', label: 'الملكي الكحلي' },
  { id: 'steel-light', label: 'الفولاذي الاحترافي' },
  { id: 'midnight-onyx', label: 'السواد الفاخر' },
  { id: 'quartz-minimal', label: 'الكوارتز الهادئ' },
  { id: 'mocha-executive', label: 'البني الفاخر' },
  { id: 'arctic-frost', label: 'الجليد النقي' },
  { id: 'obsidian-red', label: 'الأحمر الجاد' },
  { id: 'imperial-purple', label: 'البنفسجي الإمبراطوري' },
  { id: 'emerald-bureau', label: 'الديوان الزمردي' },
];

const STORAGE_KEY = 'bi-erp-theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'ocean-dark';
    return localStorage.getItem(STORAGE_KEY) || 'ocean-dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
  }, [theme]);

  const setTheme = useCallback((id) => {
    if (THEMES.some((t) => t.id === id)) setThemeState(id);
  }, []);

  return { theme, setTheme, themes: THEMES };
}
