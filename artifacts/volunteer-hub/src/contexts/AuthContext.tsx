import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Volunteer } from '@workspace/api-client-react/src/generated/api.schemas';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  volunteer: Volunteer | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  volunteer: null,
  isAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  // Stays true until the first onAuthStateChange fires (INITIAL_SESSION).
  // This prevents ProtectedRoute from flashing /login before the session is known.
  const [isLoading, setIsLoading] = useState(true);

  const fetchVolunteer = useCallback(async (email: string) => {
    try {
      const { data } = await supabase
        .from('volunteers')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      setVolunteer((data as Volunteer) ?? null);
    } catch {
      // Volunteer table may not exist yet (setup.sql not run) — that's OK,
      // the user can still be authenticated; they just won't be an admin.
      setVolunteer(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange fires synchronously with INITIAL_SESSION on subscribe,
    // giving us the persisted session from localStorage immediately — no need
    // for a separate getSession() call (which would race with this listener).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user?.email) {
          await fetchVolunteer(newSession.user.email);
        } else {
          setVolunteer(null);
        }

        // Mark loading complete after the first event (INITIAL_SESSION).
        // Subsequent events (TOKEN_REFRESHED, SIGNED_IN, etc.) don't reset
        // isLoading so there is no brief "redirect to /login" flash.
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchVolunteer]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = !!volunteer?.is_admin;

  return (
    <AuthContext.Provider value={{ session, user, volunteer, isAdmin, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
