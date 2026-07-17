import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.email) {
          await fetchVolunteer(session.user.email);
        } else {
          setVolunteer(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        if (mounted) setIsLoading(false);
      }
    };

    const fetchVolunteer = async (email: string) => {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('email', email)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching volunteer:', error);
        }
        if (mounted) {
          setVolunteer(data as Volunteer | null);
        }
      } catch (error) {
        console.error('Failed to fetch volunteer', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        setIsLoading(true);
        await fetchVolunteer(session.user.email);
      } else {
        setVolunteer(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
