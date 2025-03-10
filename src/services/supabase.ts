import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Use hardcoded values from .env file since process.env isn't working correctly
const supabaseUrl = "https://ppipubzwklhrfhzsdjkl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaXB1Ynp3a2xocmZoenNkamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1ODQ1NzAsImV4cCI6MjA1NzE2MDU3MH0.z7ZNkjWaiVhbcErmOFm3ZBIp62gs25D5OuVF5qRPS9g";

// Initialize Supabase client
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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

export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updatePassword = async (newPassword: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// User profile functions
export const createUserProfile = async (userId: string, userData: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: userId, ...userData }]);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

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

// Constellation functions
export const createConstellation = async (name: string, userId: string) => {
  try {
    // Generate a random 6-character invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('constellations')
      .insert([{ 
        name, 
        created_by: userId,
        invite_code: inviteCode
      }])
      .select();
    
    if (error) throw error;
    
    // Add the creator as a member
    if (data && data[0]) {
      const constellationId = data[0].id;
      const { error: memberError } = await supabase
        .from('constellation_members')
        .insert([{ 
          constellation_id: constellationId, 
          user_id: userId,
          role: 'LUMINARY' // Assuming the creator is a LUMINARY
        }]);
      
      if (memberError) throw memberError;
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const joinConstellation = async (inviteCode: string, userId: string) => {
  try {
    // Find the constellation with the invite code
    const { data: constellation, error: findError } = await supabase
      .from('constellations')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();
    
    if (findError) throw findError;
    if (!constellation) throw new Error('Constellation not found');
    
    // Add the user as a member
    const { data, error } = await supabase
      .from('constellation_members')
      .insert([{ 
        constellation_id: constellation.id, 
        user_id: userId,
        role: 'NAVIGATOR' // Assuming new members are NAVIGATORS
      }]);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getConstellationMembers = async (constellationId: string) => {
  try {
    const { data, error } = await supabase
      .from('constellation_members')
      .select(`
        user_id,
        role,
        profiles:user_id (
          name,
          email,
          avatar_url
        )
      `)
      .eq('constellation_id', constellationId);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Message functions
export const sendMessage = async (constellationId: string, userId: string, content: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ 
        constellation_id: constellationId, 
        user_id: userId,
        content
      }]);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getMessages = async (constellationId: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (
          name,
          avatar_url
        )
      `)
      .eq('constellation_id', constellationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Subscribe to real-time updates
export const subscribeToMessages = (constellationId: string, callback: Function) => {
  return supabase
    .channel(`messages:constellation_id=eq.${constellationId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `constellation_id=eq.${constellationId}`
    }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
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