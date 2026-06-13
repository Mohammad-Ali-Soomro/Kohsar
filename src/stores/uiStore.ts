import { create } from 'zustand';

interface UIState {
  selectedCategory: string | null;
  activeTab: string;
  toastMessage: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
  
  setCategory: (category: string | null) => void;
  setActiveTab: (tab: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedCategory: null,
  activeTab: 'Discover',
  toastMessage: null,

  setCategory: (category) => set({ selectedCategory: category }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  showToast: (message, type = 'info') => {
    set({ toastMessage: { message, type } });
    
    // Auto-clear toast after 2.5 seconds
    setTimeout(() => {
      set((state) => {
        if (state.toastMessage?.message === message) {
          return { toastMessage: null };
        }
        return {};
      });
    }, 2500);
  },

  clearToast: () => set({ toastMessage: null }),
}));
