import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { DEFAULT_REST } from '@/constants';
import { loadJSON, saveJSON, removeKey, STORAGE_KEYS } from '@/utils/storage';

export const DEFAULT_PROFILE: UserProfile = {
  nickname: '健身新人',
  avatar: '💪',
  defaultRest: DEFAULT_REST,
  restEnabled: true,
  noteEnabled: true
};

interface ProfileState {
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: { ...DEFAULT_PROFILE, ...loadJSON<Partial<UserProfile>>(STORAGE_KEYS.profile, {}) },
  updateProfile: (patch) => {
    const profile = { ...get().profile, ...patch };
    saveJSON(STORAGE_KEYS.profile, profile);
    set({ profile });
  },
  resetProfile: () => {
    removeKey(STORAGE_KEYS.profile);
    set({ profile: { ...DEFAULT_PROFILE } });
  }
}));
