import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Profile } from '../store/db';
import { DEFAULT_PROFILE_ID, ensureDefaultProfile, listProfiles } from '../store/profiles';
import { getSetting, setSetting, settingKeys } from '../store/settings';

interface ProfileContextValue {
  profiles: Profile[];
  active: Profile | null;
  activeId: string;
  setActive: (id: string) => void;
  refresh: () => Promise<void>;
  loaded: boolean;
}

const Ctx = createContext<ProfileContextValue>({
  profiles: [], active: null, activeId: DEFAULT_PROFILE_ID, setActive: () => {}, refresh: async () => {}, loaded: false,
});

/** Loads the profiles and the active one. The first profile ("Reader") keeps the data logged before profiles existed. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>(DEFAULT_PROFILE_ID);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    await ensureDefaultProfile();
    const list = await listProfiles();
    setProfiles(list);
    const saved = await getSetting<string>(settingKeys.activeProfile, DEFAULT_PROFILE_ID);
    setActiveId(list.some((p) => p.id === saved) ? saved : (list[0]?.id ?? DEFAULT_PROFILE_ID));
    setLoaded(true);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    void setSetting(settingKeys.activeProfile, id);
  }, []);

  const value = useMemo<ProfileContextValue>(() => ({
    profiles, active: profiles.find((p) => p.id === activeId) ?? null, activeId, setActive, refresh, loaded,
  }), [profiles, activeId, setActive, refresh, loaded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfiles(): ProfileContextValue {
  return useContext(Ctx);
}

/** The reading profile's id. Screens use this instead of a fixed id. */
export function useActiveProfileId(): string {
  return useContext(Ctx).activeId;
}
