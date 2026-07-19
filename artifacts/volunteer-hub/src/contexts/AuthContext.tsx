import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

const TOKEN_KEY = 'vhub_token';

export interface VolunteerSession {
  volunteerId: string;
  email: string;
  name: string;
  workstreams: string[];
  isAdmin: boolean;
  avatarUrl: string | null;
}

type AuthContextType = {
  volunteer: VolunteerSession | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<{ error?: string }>;
  signOut: () => void;
  updateAvatar: (url: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  volunteer: null,
  isAdmin: false,
  isLoading: true,
  login: async () => ({}),
  signOut: () => {},
  updateAvatar: () => {},
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...(opts?.headers as Record<string, string> ?? {}) } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    return () => setAuthTokenGetter(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }
    apiFetch('/api/auth/me')
      .then(({ ok, data }) => {
        if (ok && data?.volunteerId) setVolunteer(data as VolunteerSession);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (rawEmail: string): Promise<{ error?: string }> => {
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: rawEmail }),
    });
    if (!ok) return { error: data?.error ?? 'Login failed. Please try again.' };
    localStorage.setItem(TOKEN_KEY, data.token);
    setVolunteer(data.volunteer as VolunteerSession);
    return {};
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setVolunteer(null);
  }, []);

  const updateAvatar = useCallback((url: string) => {
    setVolunteer((prev) => prev ? { ...prev, avatarUrl: url } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ volunteer, isAdmin: volunteer?.isAdmin ?? false, isLoading, login, signOut, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
