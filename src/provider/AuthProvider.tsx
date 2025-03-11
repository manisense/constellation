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
    // Get the current user from session if not available in state
    const currentUser = user || (await supabase.auth.getSession()).data.session?.user;
    
    if (!currentUser) {
      console.log("Cannot refresh status: No authenticated user");
      return;
    }
    
    try {
      console.log("Refreshing user status for user ID:", currentUser.id);
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
        } else if (data.status === 'quiz_needed') {
          console.log("User needs to complete quiz");
          setInviteCode(null);
        } else if (data.status === 'complete') {
          console.log("User's constellation is complete");
          setInviteCode(null);
        } else if (data.status === 'no_constellation') {
          console.log("User has no constellation");
          setInviteCode(null);
        }
        
        console.log("Updated user status to:", data.status);
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
            // Use the session user directly to avoid timing issues
            const currentUser = data.session.user;
            try {
              console.log("Refreshing user status for user ID:", currentUser.id);
              const { data: statusData, error: statusError } = await getUserConstellationStatus();
              
              if (statusError) {
                console.error('Error getting user status:', statusError);
              } else if (statusData) {
                console.log("User status received:", statusData.status);
                setUserStatus(statusData.status);
                
                if (statusData.status === 'waiting_for_partner' && statusData.constellation) {
                  console.log("User is waiting for partner, invite code:", statusData.constellation.invite_code);
                  setInviteCode(statusData.constellation.invite_code);
                } else if (statusData.status === 'quiz_needed') {
                  console.log("User needs to complete quiz");
                  setInviteCode(null);
                } else if (statusData.status === 'complete') {
                  console.log("User's constellation is complete");
                  setInviteCode(null);
                } else if (statusData.status === 'no_constellation') {
                  console.log("User has no constellation");
                  setInviteCode(null);
                }
                
                console.log("Updated user status to:", statusData.status);
              }
            } catch (error) {
              console.error('Error refreshing user status:', error);
            }
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
              
              // Check user's constellation status
              try {
                console.log('Checking user constellation status after sign in');
                const { data: statusData, error: statusError } = await getUserConstellationStatus();
                
                if (statusError) {
                  console.error('Error getting user constellation status:', statusError);
                } else if (statusData) {
                  console.log('User constellation status:', statusData.status);
                  setUserStatus(statusData.status);
                  
                  // If user is waiting for partner, set the invite code
                  if (statusData.status === 'waiting_for_partner' && statusData.constellation) {
                    console.log('User is waiting for partner, invite code:', statusData.constellation.invite_code);
                    setInviteCode(statusData.constellation.invite_code);
                  }
                }
              } catch (error) {
                console.error('Error in constellation status check:', error);
              }
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
              
              // Refresh user status when user is updated
              await refreshUserStatus();
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