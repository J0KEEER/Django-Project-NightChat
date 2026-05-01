import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: localStorage.getItem('nightchat-theme') === 'dark',

  toggleTheme: () => set((state) => {
    const newIsDark = !state.isDark;
    localStorage.setItem('nightchat-theme', newIsDark ? 'dark' : 'light');

    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return { isDark: newIsDark };
  }),

  initTheme: () => {
    const isDark = localStorage.getItem('nightchat-theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDark });
  },
}));
