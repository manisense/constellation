import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getUserConstellationStatus, shouldShowHomeScreen } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userStatus: 'no_constellation' | 'waiting_for_partner' | 'quiz_needed' | 'complete' | null;
  inviteCode: string | null;
  refreshUserStatus: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userStatus: null,
  inviteCode: null,
  refreshUserStatus: async () => {},
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
  const [userStatus, setUserStatus] = useState<'no_constellation' | 'waiting_for_partner' | 'quiz_needed' | 'complete' | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const refreshUserStatus = async () => {
    if (!user) {
      console.log("Cannot refresh status: No authenticated user");
      return;
    }
    
    try {
      console.log("Refreshing user status for user ID:", user.id);
      const { data, error } = await getUserConstellationStatus();
      
      if (error) {
        console.error('Error getting user status:', error);
        return;
      }
      
      if (data) {
        console.log("User status received:", data.status);
        setUserStatus(data.status);
        
        if (data.status === 'waiting_for_partner' && data.constellation) {
          console.log("User is waiting for partner, invite code:", data.constellation.invite_code);
          setInviteCode(data.constellation.invite_code);
        }
      }
    } catch (error) {
      console.error('Error refreshing user status:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        const { data } = await supabase.auth.getSession();
        
        // Set session and user
        setSession(data.session);
        
        // Check if the session has a valid user
        if (data.session?.user?.id) {
          console.log("Auth session found with user ID:", data.session.user.id);
          setUser(data.session.user);
          
          // Verify the user exists in the database
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.session.user.id)
            .single();
            
          if (userError || !userData) {
            console.log("User not found in profiles table, signing out");
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setUserStatus(null);
            setInviteCode(null);
          } else {
            console.log("User verified in profiles table, checking constellation status");
            await refreshUserStatus();
          }
        } else {
          console.log("No auth session found or invalid user");
          setUser(null);
          setUserStatus(null);
          setInviteCode(null);
        }
        
        setLoading(false);

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log(`Supabase auth event: ${event}`);
            
            if (event === 'SIGNED_IN' && newSession?.user?.id) {
              console.log('User signed in with ID:', newSession.user.id);
              setSession(newSession);
              setUser(newSession.user);
              
              // Check user status but don't create profile here
              // This allows the user to proceed to create/join constellation
              await refreshUserStatus();
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out');
              setUser(null);
              setSession(null);
              setUserStatus(null);
              setInviteCode(null);
            } else if (event === 'USER_UPDATED' && newSession?.user) {
              console.log('User updated:', newSession.user.id);
              setSession(newSession);
              setUser(newSession.user);
            }
            
            setLoading(false);
          }
        );

        // Clean up subscription
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 