import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { BusinessType, Organization, SystemInfo } from './types';

type AppState = {
  org: Organization | null;
  businessTypes: BusinessType[];
  system: SystemInfo | null;
  states: { code: string; name: string }[];
  units: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AppState>({
  org: null, businessTypes: [], system: null, states: [], units: [],
  loading: true, error: null, refresh: async () => {},
});

export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [states, setStates] = useState<{ code: string; name: string }[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, bt, sys, st, un] = await Promise.all([
        api.get<Organization>('/settings/organization'),
        api.get<BusinessType[]>('/business-types?all=1'),
        api.get<SystemInfo>('/settings/system'),
        api.get<{ code: string; name: string }[]>('/meta/states'),
        api.get<string[]>('/meta/units'),
      ]);
      setOrg(o);
      setBusinessTypes(bt);
      setSystem(sys);
      setStates(st);
      setUnits(un);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the API server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ org, businessTypes, system, states, units, loading, error, refresh }),
    [org, businessTypes, system, states, units, loading, error, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Active business types only, in display order — what every picker should show. */
export function useActiveBusinessTypes() {
  const { businessTypes } = useApp();
  return useMemo(() => businessTypes.filter((b) => b.active), [businessTypes]);
}
