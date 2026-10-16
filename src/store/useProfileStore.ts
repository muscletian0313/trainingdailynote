import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { DEFAULT_REST, LEVEL_NICKNAMES } from '@/constants';
import { GENDER_AVATAR } from '@/assets/avatars';
import { loadJSON, saveJSON, removeKey, STORAGE_KEYS } from '@/utils/storage';

export const DEFAULT_PROFILE: UserProfile = {
  nickname: '健身新人',
  avatar: '💪',
  defaultRest: DEFAULT_REST,
  restEnabled: true,
  restSoundId: 'bell',
  restVibrate: false,
  noteEnabled: true
};

/**
 * 读档：早期版本只存了问卷结果、没同步昵称和头像，
 * 这两项还停在默认值时按问卷补上（用户自己改过的不动）。
 */
function loadProfile(): UserProfile {
  const profile: UserProfile = {
    ...DEFAULT_PROFILE,
    ...loadJSON<Partial<UserProfile>>(STORAGE_KEYS.profile, {})
  };
  const patch: Partial<UserProfile> = {};

  const levelNickname = profile.experience ? LEVEL_NICKNAMES[profile.experience] : undefined;
  if (levelNickname && profile.nickname === DEFAULT_PROFILE.nickname) {
    patch.nickname = levelNickname;
  }
  if (profile.gender && profile.avatar === DEFAULT_PROFILE.avatar) {
    patch.avatar = GENDER_AVATAR[profile.gender];
  }

  return Object.keys(patch).length ? { ...profile, ...patch } : profile;
}

interface ProfileState {
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: loadProfile(),
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
