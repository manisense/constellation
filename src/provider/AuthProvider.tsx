import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase, getUserConstellationStatus } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import {
  initializeOneSignal,
  syncCurrentOneSignalPushDevice,
  unregisterCurrentOneSignalPushDevice,
} from '../services/notificationService';

type UserStatus = 'no_constellation' | 'waiting_for_partner' | 'complete';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userStatus: UserStatus | null;
  inviteCode: string | null;
  refreshUserStatus: () => Promise<void>;
  signOut: (navigation: NavigationProp<any>) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userStatus: null,
  inviteCode: null,
  refreshUserStatus: async () => {},
  signOut: async () => {},
});

// Export the useAuth hook directly from this file
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const normalizeStatus = (status: any): UserStatus => {
    if (status === 'no_constellation' || status === 'waiting_for_partner' || status === 'complete') {
      return status;
    }

    if (status === 'quiz_needed') {
      return 'complete';
    }

    return 'no_constellation';
  };

  const applyStatusState = useCallback((statusPayload: any) => {
    const normalizedStatus = normalizeStatus(statusPayload?.status);
    setUserStatus(normalizedStatus);

    if (normalizedStatus === 'waiting_for_partner' && statusPayload?.constellation?.invite_code) {
      setInviteCode(statusPayload.constellation.invite_code);
      return;
    }

    setInviteCode(null);
  }, []);

  const refreshUserStatus = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const runRefresh = async () => {
      const currentUser = (await supabase.auth.getSession()).data.session?.user;

      if (!currentUser) {
        setUserStatus(null);
        setInviteCode(null);
        return;
      }

      try {
        const { data, error } = await getUserConstellationStatus();

        if (error || !data) {
          setUserStatus('no_constellation');
          setInviteCode(null);
          return;
        }

        applyStatusState(data);
      } catch (error) {
        console.error('Error refreshing user status:', error);
        setUserStatus('no_constellation');
        setInviteCode(null);
      }
    };

    refreshInFlightRef.current = runRefresh().finally(() => {
      refreshInFlightRef.current = null;
    });

    return refreshInFlightRef.current;
  }, [applyStatusState]);

  // Improved sign-out function with proper navigation handling
  const signOut = async (navigation: NavigationProp<any>) => {
    try {
      console.log('Signing out...');

      await unregisterCurrentOneSignalPushDevice();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setSession(null);
      setUserStatus(null);
      setInviteCode(null);
      
      console.log('Sign out successful, preparing to navigate...');
      
      // Add delay to ensure sign-out completes before navigation
      setTimeout(() => {
        // Reset navigation stack to Welcome screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
        console.log('Navigation reset completed');
      }, 500); // 500ms delay
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await initializeOneSignal();

        const { data } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user?.id) {
          await syncCurrentOneSignalPushDevice();
          await refreshUserStatus();
        } else {
          setUserStatus(null);
          setInviteCode(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) {
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setUserStatus(null);
          setInviteCode(null);
          setLoading(false);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          setSession(newSession ?? null);
          setUser(newSession?.user ?? null);

          if (newSession?.user?.id) {
            await syncCurrentOneSignalPushDevice();
            await refreshUserStatus();
          } else {
            setUserStatus(null);
            setInviteCode(null);
          }

          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userStatus,
        inviteCode,
        refreshUserStatus,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 