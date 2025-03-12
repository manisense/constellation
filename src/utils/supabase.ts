import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Alert } from 'react-native';

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
              about: userData.bio || '',
              interests: userData.interests || [],
              star_name: userData.star_name || '',
              star_type: userData.star_type || null,
              photo_url: userData.photo_url || '',
              avatar_url: userData.photo_url || '',
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
      if (error.message.includes('Invalid login credentials')) {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      } else {
        Alert.alert('Login Error', error.message);
      }
      throw error;
    }
    
    if (!data.user) {
      console.error("No user returned from signin");
      Alert.alert('Login Error', 'Failed to sign in. Please try again.');
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
              about: data.user.user_metadata?.bio || '',
              interests: data.user.user_metadata?.interests || [],
              star_name: data.user.user_metadata?.star_name || '',
              star_type: data.user.user_metadata?.star_type || null,
              photo_url: data.user.user_metadata?.avatar_url || '',
              avatar_url: data.user.user_metadata?.avatar_url || '',
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

// Profile functions
export const updateProfile = async (profileData: {
  name?: string;
  about?: string;
  interests?: any[];
  star_name?: string;
  star_type?: string;
  photo_url?: string;
  avatar_url?: string;
}) => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user found');
    }

    // Use the RPC function for better error handling
    const { data, error } = await supabase.rpc('update_profile', {
      name: profileData.name,
      about: profileData.about,
      interests: profileData.interests,
      star_name: profileData.star_name,
      star_type: profileData.star_type,
      avatar_url: profileData.avatar_url,
    });

    if (error) {
      console.error('Error updating profile via RPC:', error);
      
      // Fallback to direct update
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          about: profileData.about,
          interests: profileData.interests,
          star_name: profileData.star_name,
          star_type: profileData.star_type,
          photo_url: profileData.photo_url || profileData.avatar_url,
          avatar_url: profileData.avatar_url || profileData.photo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.data.user.id);
      
      if (updateError) {
        console.error('Error updating profile directly:', updateError);
        throw updateError;
      }
      
      return { success: true };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error };
  }
};

export const getProfile = async () => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user found');
    }

    // Try using the RPC function first
    try {
      const { data, error } = await supabase.rpc('get_profile');
      
      if (error) {
        console.error('Error getting profile via RPC:', error);
        throw error;
      }
      
      if (data && data.success) {
        return { data: data.profile, error: null };
      }
    } catch (rpcError) {
      console.log('Falling back to direct profile query');
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.data.user.id)
      .single();
    
    if (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Profile retrieval error:', error);
    return { data: null, error };
  }
};

// Constellation functions
export const getUserConstellationStatus = async () => {
  try {
    console.log("Calling get_user_constellation_status RPC function");
    const { data, error } = await supabase.rpc('get_user_constellation_status');
    
    if (error) {
      console.error("Error in getUserConstellationStatus RPC call:", error.message);
      throw error;
    }
    
    console.log("getUserConstellationStatus response:", data);
    return { data, error: null };
  } catch (error: any) {
    console.error("Exception in getUserConstellationStatus:", error.message || error);
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
        const { data: constellationData, error: constellationError } = await supabase
          .from('constellations')
          .insert({
            name: name,
            invite_code: generateInviteCode(),
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();
        
        if (constellationError) {
          console.error("Error creating constellation:", constellationError);
          throw constellationError;
        }
        
        // Step 2: Add the current user as a member
        const { error: memberError } = await supabase
          .from('constellation_members')
          .insert({
            constellation_id: constellationData.id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            status: 'active',
            star_type: 'luminary'
          });
        
        if (memberError) {
          console.error("Error adding member:", memberError);
          throw memberError;
        }
        
        return { data: constellationData, error: null };
      } else {
        throw error;
      }
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Exception in createConstellation:", error.message || error);
    return { data: null, error };
  }
};

export const joinConstellation = async (inviteCode: string) => {
  try {
    // First try using the RPC function
    const { data, error } = await supabase.rpc('join_constellation', {
      invite_code: inviteCode
    });
    
    if (error) {
      console.error("RPC error:", error);
      
      // If we get an error, try a direct approach
      if (error.message) {
        console.log("Falling back to direct SQL approach");
        
        // Step 1: Find the constellation with the invite code
        const { data: constellationData, error: constellationError } = await supabase
          .from('constellations')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();
        
        if (constellationError) {
          console.error("Error finding constellation:", constellationError);
          throw new Error("Invalid invite code");
        }
        
        // Step 2: Check if user is already a member
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('constellation_members')
          .select('id')
          .eq('constellation_id', constellationData.id)
          .eq('user_id', userId)
          .maybeSingle();
        
        if (memberCheckError) {
          console.error("Error checking membership:", memberCheckError);
          throw memberCheckError;
        }
        
        if (existingMember) {
          return { data: { already_member: true }, error: null };
        }
        
        // Step 3: Add the current user as a member
        const { data: memberData, error: memberError } = await supabase
          .from('constellation_members')
          .insert({
            constellation_id: constellationData.id,
            user_id: userId,
            status: 'active',
            star_type: 'navigator'
          })
          .select()
          .single();
        
        if (memberError) {
          console.error("Error adding member:", memberError);
          throw memberError;
        }
        
        return { data: { success: true, constellation_id: constellationData.id }, error: null };
      } else {
        throw error;
      }
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Exception in joinConstellation:", error.message || error);
    return { data: null, error };
  }
};

// Chat functions
export const getConstellationMessages = async (constellationId: string) => {
  try {
    console.log(`Getting messages for constellation: ${constellationId}`);
    
    // Try using the RPC function first
    try {
      const { data, error } = await supabase.rpc('get_constellation_messages', { 
        constellation_id: constellationId 
      });
      
      if (error) {
        console.error('Error getting messages via RPC:', error);
        throw error;
      }
      
      console.log(`Retrieved ${data.length} messages`);
      return { data, error: null };
    } catch (rpcError) {
      console.log('Falling back to direct query');
      
      // Fallback to direct query with proper table aliases
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          constellation_id,
          user_id,
          content,
          image_url,
          created_at,
          profiles:user_id (name)
        `)
        .eq('constellation_id', constellationId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error getting messages directly:', error);
        throw error;
      }
      
      // Transform the data to match the expected format
      const formattedData = data.map((message: any) => ({
        ...message,
        sender_name: message.profiles?.name || 'Unknown'
      }));
      
      console.log(`Retrieved ${formattedData.length} messages`);
      return { data: formattedData, error: null };
    }
  } catch (error) {
    console.error('Error in getConstellationMessages:', error);
    return { data: [], error };
  }
};

export const sendMessage = async (constellationId: string, content: string, imageUrl: string | null = null) => {
  try {
    console.log(`Sending message to constellation ${constellationId}`);
    
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('send_message', {
      constellation_id: constellationId,
      content: content || (imageUrl ? '📷 Image' : ''),
      image_url: imageUrl
    });
    
    if (error) {
      console.error('Error sending message via RPC:', error);
      
      // Fallback to direct insert
      const { data: insertData, error: insertError } = await supabase
        .from('messages')
        .insert({
          constellation_id: constellationId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content: content,
          image_url: imageUrl
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error sending message directly:', insertError);
        throw insertError;
      }
      
      console.log('Message sent successfully via direct insert');
      return { data: { success: true, message_id: insertData.id }, error: null };
    }
    
    console.log('Message sent successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return { data: null, error };
  }
};

export const getPartnerProfile = async (constellationId: string) => {
  try {
    console.log(`Getting partner profile for constellation: ${constellationId}`);
    
    // Try using the RPC function first
    try {
      const { data, error } = await supabase.rpc('get_partner_profile', {
        constellation_id: constellationId
      });
      
      if (error) {
        console.error('Error getting partner profile via RPC:', error);
        throw error;
      }
      
      if (data && data.success) {
        return { data: data.partner, error: null };
      } else {
        console.log('No partner found or error:', data?.error);
        return { data: null, error: data?.error || 'No partner found' };
      }
    } catch (rpcError) {
      console.log('Falling back to direct query');
      
      // Fallback to direct query with proper table aliases
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Define the expected type for the response
      type PartnerProfileResponse = {
        user_id: string;
        star_type: string;
        profiles: {
          id: string;
          name: string;
          about: string;
          photo_url: string;
          star_name: string;
          star_type: string;
        };
      };
      
      const { data, error } = await supabase
        .from('constellation_members')
        .select(`
          user_id,
          star_type,
          profiles:user_id (
            id,
            name,
            about,
            photo_url,
            star_name,
            star_type
          )
        `)
        .eq('constellation_id', constellationId)
        .neq('user_id', userId)
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error getting partner profile directly:', error);
        throw error;
      }
      
      // Cast the data to the expected type
      const typedData = data as unknown as PartnerProfileResponse;
      
      // Transform the data to match the expected format
      const partnerData = {
        id: typedData.profiles?.id || '',
        name: typedData.profiles?.name || 'Unknown',
        bio: typedData.profiles?.about || '',
        avatar_url: typedData.profiles?.photo_url || '',
        star_name: typedData.profiles?.star_name || '',
        star_type: typedData.star_type || 'navigator'
      };
      
      return { data: partnerData, error: null };
    }
  } catch (error) {
    console.error('Failed to get partner profile:', error);
    return { data: null, error: 'Unknown error' };
  }
};

export const increaseBondingStrength = async (constellationId: string, amount: number = 1) => {
  try {
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('increase_bonding_strength', {
      constellation_id: constellationId,
      amount: amount
    });
    
    if (error) {
      console.error('Error increasing bonding strength via RPC:', error);
      
      // Fallback to direct update
      const { data: constellationData, error: getError } = await supabase
        .from('constellations')
        .select('bonding_strength')
        .eq('id', constellationId)
        .single();
      
      if (getError) {
        console.error('Error getting constellation data:', getError);
        throw getError;
      }
      
      const currentStrength = constellationData.bonding_strength || 0;
      const newStrength = Math.min(100, currentStrength + amount);
      
      const { error: updateError } = await supabase
        .from('constellations')
        .update({ bonding_strength: newStrength })
        .eq('id', constellationId);
      
      if (updateError) {
        console.error('Error updating bonding strength directly:', updateError);
        throw updateError;
      }
      
      return { success: true };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in increaseBondingStrength:', error);
    return { success: false, error };
  }
};

// Helper functions
const generateInviteCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
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

