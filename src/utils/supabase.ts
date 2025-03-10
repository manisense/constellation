import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Use hardcoded values from .env file since process.env isn't working correctly
const supabaseUrl = "https://ppipubzwklhrfhzsdjkl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaXB1Ynp3a2xocmZoenNkamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1ODQ1NzAsImV4cCI6MjA1NzE2MDU3MH0.z7ZNkjWaiVhbcErmOFm3ZBIp62gs25D5OuVF5qRPS9g";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Auth functions
export const signUpWithEmail = async (email: string, password: string, userData: any) => {
  try {
    console.log("Signing up with email:", email);
    console.log("User data:", userData);
    
    // First, create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    if (error) {
      console.error("Auth signup error:", error);
      throw error;
    }
    
    if (!data.user) {
      console.error("No user returned from signup");
      throw new Error("Failed to create user");
    }
    
    console.log("User created successfully:", data.user.id);
    
    // The handle_new_user trigger should create the profile automatically,
    // but let's make sure it exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();
      
    if (profileError || !profileData) {
      console.log("Profile not found, creating manually");
      
      // Try with RPC call to bypass RLS
      try {
        const { error: rpcError } = await supabase.rpc('create_user_profile', {
          user_id: data.user.id,
          user_name: userData.name || 'User',
          user_photo: userData.photo_url || ''
        });
        
        if (rpcError) {
          console.error("Error creating profile via RPC:", rpcError);
          // Fall back to direct insert
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name: userData.name || 'User',
              about: '',
              interests: [],
              star_name: '',
              star_type: null,
              photo_url: userData.photo_url || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
            // Don't throw here, as the auth user was created successfully
            console.log("Profile creation failed, but user was created. Profile will be created on first login.");
          } else {
            console.log("Profile created successfully via direct insert");
          }
        } else {
          console.log("Profile created successfully via RPC");
        }
      } catch (createError) {
        console.error("Error in profile creation process:", createError);
        // Don't throw here, as the auth user was created successfully
      }
    } else {
      console.log("Profile already exists");
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Signup process error:", error);
    return { data: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log("Signing in with email:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error("Auth signin error:", error);
      throw error;
    }
    
    if (!data.user) {
      console.error("No user returned from signin");
      throw new Error("Failed to sign in");
    }
    
    console.log("User signed in successfully:", data.user.id);
    
    // Verify the user has a profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();
      
    if (profileError || !profileData) {
      console.log("Profile not found, creating one");
      
      // Try with RPC call to bypass RLS
      try {
        const { error: rpcError } = await supabase.rpc('create_user_profile', {
          user_id: data.user.id,
          user_name: data.user.user_metadata?.name || 'User',
          user_photo: data.user.user_metadata?.avatar_url || ''
        });
        
        if (rpcError) {
          console.error("Error creating profile via RPC:", rpcError);
          // Fall back to direct insert
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name: data.user.user_metadata?.name || 'User',
              about: '',
              interests: [],
              star_name: '',
              star_type: null,
              photo_url: data.user.user_metadata?.avatar_url || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
            // Don't throw here, as the auth user was signed in successfully
            console.log("Profile creation failed, but user was signed in. Will try again on next login.");
          } else {
            console.log("Profile created successfully via direct insert");
          }
        } else {
          console.log("Profile created successfully via RPC");
        }
      } catch (createError) {
        console.error("Error in profile creation process:", createError);
        // Don't throw here, as the auth user was signed in successfully
      }
    } else {
      console.log("Profile already exists");
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Signin process error:", error);
    return { data: null, error };
  }
};

export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'constellation://auth/callback',
      },
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Constellation functions
export const getUserConstellationStatus = async () => {
  try {
    const { data, error } = await supabase.rpc('get_user_constellation_status');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createConstellation = async (name: string) => {
  try {
    // First try using the RPC function
    const { data, error } = await supabase.rpc('create_new_constellation', {
      constellation_name: name
    });
    
    if (error) {
      console.error("RPC error:", error);
      
      // If we get the ambiguous invite_code error, try a direct approach
      if (error.message && error.message.includes("invite_code\" is ambiguous")) {
        console.log("Falling back to direct SQL approach");
        
        // Step 1: Create the constellation with a name
        const { data: constData, error: constError } = await supabase
          .from('constellations')
          .insert({
            name: name,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select('id, invite_code')
          .single();
          
        if (constError) {
          console.error("Direct constellation creation error:", constError);
          throw constError;
        }
        
        // Step 2: Add the user as a member
        const { error: memberError } = await supabase
          .from('constellation_members')
          .insert({
            constellation_id: constData.id,
            user_id: (await supabase.auth.getUser()).data.user?.id
          });
          
        if (memberError) {
          console.error("Member creation error:", memberError);
          throw memberError;
        }
        
        return { 
          data: {
            success: true,
            message: 'Constellation created successfully',
            constellation_id: constData.id,
            invite_code: constData.invite_code
          }, 
          error: null 
        };
      }
      
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Create constellation error:", error);
    return { data: null, error };
  }
};

export const joinConstellationWithCode = async (inviteCode: string) => {
  try {
    // First try using the RPC function
    const { data, error } = await supabase.rpc('join_constellation_with_code', {
      invite_code: inviteCode
    });
    
    if (error) {
      console.error("RPC error:", error);
      
      // If we get an error, try a direct approach
      if (error.message) {
        console.log("Falling back to direct SQL approach");
        
        const userId = (await supabase.auth.getUser()).data.user?.id;
        
        // Step 1: Check if user is already in a constellation
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('constellation_members')
          .select('id')
          .eq('user_id', userId);
          
        if (memberCheckError) {
          console.error("Member check error:", memberCheckError);
          throw memberCheckError;
        }
        
        if (existingMember && existingMember.length > 0) {
          return { 
            data: {
              success: false,
              message: 'User is already in a constellation'
            }, 
            error: null 
          };
        }
        
        // Step 2: Find the constellation with the given invite code
        const { data: constData, error: constError } = await supabase
          .from('constellations')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();
          
        if (constError) {
          if (constError.code === 'PGRST116') {
            return { 
              data: {
                success: false,
                message: 'Invalid invite code'
              }, 
              error: null 
            };
          }
          console.error("Constellation lookup error:", constError);
          throw constError;
        }
        
        // Step 3: Check if the constellation already has 2 members
        const { data: memberCount, error: countError } = await supabase
          .from('constellation_members')
          .select('id')
          .eq('constellation_id', constData.id);
          
        if (countError) {
          console.error("Member count error:", countError);
          throw countError;
        }
        
        if (memberCount && memberCount.length >= 2) {
          return { 
            data: {
              success: false,
              message: 'Constellation already has maximum members'
            }, 
            error: null 
          };
        }
        
        // Step 4: Add the user as a member
        const { error: joinError } = await supabase
          .from('constellation_members')
          .insert({
            constellation_id: constData.id,
            user_id: userId
          });
          
        if (joinError) {
          console.error("Join constellation error:", joinError);
          throw joinError;
        }
        
        return { 
          data: {
            success: true,
            message: 'Successfully joined constellation',
            constellation_id: constData.id
          }, 
          error: null 
        };
      }
      
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Join constellation error:", error);
    return { data: null, error };
  }
};

export const updateMemberStatus = async (status: 'joined' | 'quiz_completed' | 'ready') => {
  try {
    const { data, error } = await supabase.rpc('update_member_status', {
      status_value: status
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const shouldShowHomeScreen = async () => {
  try {
    const { data, error } = await supabase.rpc('should_show_home_screen');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: false, error };
  }
};

// Profile functions
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Storage functions
export const uploadFile = async (bucket: string, path: string, file: any) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true
      });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getFileUrl = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

  
// import React, { useState, useEffect } from 'react';
// import { View, Text, FlatList } from 'react-native';
// import { supabase } from '../utils/supabase';

// export default function App() {
//   const [todos, setTodos] = useState([]);

//   useEffect(() => {
//     const getTodos = async () => {
//       try {
//         const { data: todos, error } = await supabase.from('todos').select();

//         if (error) {
//           console.error('Error fetching todos:', error.message);
//           return;
//         }

//         if (todos && todos.length > 0) {
//           setTodos(todos);
//         }
//       } catch (error) {
//         console.error('Error fetching todos:', error.message);
//       }
//     };

//     getTodos();
//   }, []);

//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text>Todo List</Text>
//       <FlatList
//         data={todos}
//         keyExtractor={(item) => item.id.toString()}
//         renderItem={({ item }) => <Text key={item.id}>{item.title}</Text>}
//       />
//     </View>
//   );
// };

