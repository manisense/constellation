import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

const appConfig = require("../../app.json");
const appExtra = appConfig?.expo?.extra || {};

const getRequiredEnv = (key: string, fallbackKey?: string) => {
  const value =
    process.env[key] || (fallbackKey ? appExtra[fallbackKey] : undefined);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const supabaseUrl = getRequiredEnv("EXPO_PUBLIC_SUPABASE_URL", "supabaseUrl");
const supabaseAnonKey = getRequiredEnv(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "supabaseAnonKey"
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth functions
export const signUpWithEmail = async (
  email: string,
  password: string,
  userData: any
) => {
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
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData) {
      console.log("Profile not found, creating manually");

      // Try with RPC call to bypass RLS
      try {
        const { error: rpcError } = await supabase.rpc("create_user_profile", {
          user_id: data.user.id,
          user_name: userData.name || "User",
          user_photo: userData.photo_url || "",
        });

        if (rpcError) {
          console.error("Error creating profile via RPC:", rpcError);
          // Fall back to direct insert
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              name: userData.name || "User",
              about: userData.bio || "",
              interests: userData.interests || [],
              star_name: userData.star_name || "",
              star_type: userData.star_type || null,
              photo_url: userData.photo_url || "",
              avatar_url: userData.photo_url || "",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error creating profile:", insertError);
            // Don't throw here, as the auth user was created successfully
            console.log(
              "Profile creation failed, but user was created. Profile will be created on first login."
            );
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
      if (error.message.includes("Invalid login credentials")) {
        Alert.alert(
          "Login Failed",
          "Invalid email or password. Please try again."
        );
      } else {
        Alert.alert("Login Error", error.message);
      }
      throw error;
    }

    if (!data.user) {
      console.error("No user returned from signin");
      Alert.alert("Login Error", "Failed to sign in. Please try again.");
      throw new Error("Failed to sign in");
    }

    console.log("User signed in successfully:", data.user.id);

    // Verify the user has a profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData) {
      console.log("Profile not found, creating one");

      // Try with RPC call to bypass RLS
      try {
        const { error: rpcError } = await supabase.rpc("create_user_profile", {
          user_id: data.user.id,
          user_name: data.user.user_metadata?.name || "User",
          user_photo: data.user.user_metadata?.avatar_url || "",
        });

        if (rpcError) {
          console.error("Error creating profile via RPC:", rpcError);
          // Fall back to direct insert
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              name: data.user.user_metadata?.name || "User",
              about: data.user.user_metadata?.bio || "",
              interests: data.user.user_metadata?.interests || [],
              star_name: data.user.user_metadata?.star_name || "",
              star_type: data.user.user_metadata?.star_type || null,
              photo_url: data.user.user_metadata?.avatar_url || "",
              avatar_url: data.user.user_metadata?.avatar_url || "",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error creating profile:", insertError);
            // Don't throw here, as the auth user was signed in successfully
            console.log(
              "Profile creation failed, but user was signed in. Will try again on next login."
            );
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
    const redirectTo = AuthSession.makeRedirectUri({
      scheme: "com.constellation.app",
      path: "auth/callback",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (!data?.url) {
      throw new Error("Failed to initialize Google OAuth flow");
    }

    const authResult = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo
    );

    if (authResult.type !== "success" || !authResult.url) {
      throw new Error("Google sign-in was cancelled or did not complete");
    }

    const callbackUrl = new URL(authResult.url);

    const hashParams = new URLSearchParams(
      callbackUrl.hash?.startsWith("#")
        ? callbackUrl.hash.slice(1)
        : callbackUrl.hash || ""
    );

    const code = callbackUrl.searchParams.get("code") || hashParams.get("code");
    const callbackError =
      callbackUrl.searchParams.get("error_description") ||
      callbackUrl.searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error");

    if (callbackError) {
      throw new Error(callbackError);
    }

    if (code) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) throw sessionError;

      return { data: sessionData, error: null };
    }

    const accessToken =
      callbackUrl.searchParams.get("access_token") ||
      hashParams.get("access_token");
    const refreshToken =
      callbackUrl.searchParams.get("refresh_token") ||
      hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError) throw sessionError;

      return { data: sessionData, error: null };
    }

    throw new Error(
      "No authorization code or session tokens received from Google"
    );
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
      throw new Error("No authenticated user found");
    }

    // Use the RPC function for better error handling
    const { data, error } = await supabase.rpc("update_profile", {
      name: profileData.name,
      about: profileData.about,
      interests: profileData.interests,
      star_name: profileData.star_name,
      star_type: profileData.star_type,
      avatar_url: profileData.avatar_url,
    });

    if (error) {
      console.error("Error updating profile via RPC:", error);

      // Fallback to direct update
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: profileData.name,
          about: profileData.about,
          interests: profileData.interests,
          star_name: profileData.star_name,
          star_type: profileData.star_type,
          photo_url: profileData.photo_url || profileData.avatar_url,
          avatar_url: profileData.avatar_url || profileData.photo_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.data.user.id);

      if (updateError) {
        console.error("Error updating profile directly:", updateError);
        throw updateError;
      }

      return { success: true };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Profile update error:", error);
    return { success: false, error };
  }
};

export const getProfile = async () => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error("No authenticated user found");
    }

    // Try using the RPC function first
    try {
      const { data, error } = await supabase.rpc("get_profile");

      if (error) {
        console.error("Error getting profile via RPC:", error);
        throw error;
      }

      if (data && data.success) {
        return { data: data.profile, error: null };
      }
    } catch (rpcError) {
      console.log("Falling back to direct profile query");
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.data.user.id)
      .single();

    if (error) {
      console.error("Error getting profile:", error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Profile retrieval error:", error);
    return { data: null, error };
  }
};

// Constellation functions
export const getUserConstellationStatus = async () => {
  try {
    console.log("Calling get_user_constellation_status RPC function");
    const { data, error } = await supabase.rpc("get_user_constellation_status");

    if (error) {
      console.error(
        "Error in getUserConstellationStatus RPC call:",
        error.message
      );
      throw error;
    }

    console.log("getUserConstellationStatus response:", data);
    return { data, error: null };
  } catch (error: any) {
    console.error(
      "Exception in getUserConstellationStatus:",
      error.message || error
    );
    return { data: null, error };
  }
};

export const createConstellation = async (name: string) => {
  try {
    // First try using the RPC function
    const { data, error } = await supabase.rpc("create_new_constellation", {
      constellation_name: name,
    });

    if (error) {
      console.error("RPC error:", error);

      // If we get the ambiguous invite_code error, try a direct approach
      if (
        error.message &&
        error.message.includes('invite_code" is ambiguous')
      ) {
        console.log("Falling back to direct SQL approach");

        // Step 1: Create the constellation with a name
        const { data: constellationData, error: constellationError } =
          await supabase
            .from("constellations")
            .insert({
              name: name,
              invite_code: generateInviteCode(),
              created_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .select()
            .single();

        if (constellationError) {
          console.error("Error creating constellation:", constellationError);
          throw constellationError;
        }

        // Step 2: Add the current user as a member
        const { error: memberError } = await supabase
          .from("constellation_members")
          .insert({
            constellation_id: constellationData.id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            status: "active",
            star_type: "luminary",
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
    const { data, error } = await supabase.rpc("join_constellation", {
      invite_code: inviteCode,
    });

    if (error) {
      console.error("RPC error:", error);

      // If we get an error, try a direct approach
      if (error.message) {
        console.log("Falling back to direct SQL approach");

        // Step 1: Find the constellation with the invite code
        const { data: constellationData, error: constellationError } =
          await supabase
            .from("constellations")
            .select("id")
            .eq("invite_code", inviteCode)
            .single();

        if (constellationError) {
          console.error("Error finding constellation:", constellationError);
          throw new Error("Invalid invite code");
        }

        // Step 2: Check if user is already a member
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { data: existingMember, error: memberCheckError } = await supabase
          .from("constellation_members")
          .select("id")
          .eq("constellation_id", constellationData.id)
          .eq("user_id", userId)
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
          .from("constellation_members")
          .insert({
            constellation_id: constellationData.id,
            user_id: userId,
            status: "active",
            star_type: "navigator",
          })
          .select()
          .single();

        if (memberError) {
          console.error("Error adding member:", memberError);
          throw memberError;
        }

        return {
          data: { success: true, constellation_id: constellationData.id },
          error: null,
        };
      } else {
        throw error;
      }
    }

    if (data && typeof data === "object") {
      return { data, error: null };
    }

    return {
      data: {
        success: Boolean(data),
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Exception in joinConstellation:", error.message || error);
    return { data: null, error };
  }
};

export const joinConstellationWithCode = async (inviteCode: string) => {
  return joinConstellation(inviteCode);
};

// Chat functions
export const getConstellationMessages = async (constellationId: string) => {
  try {
    console.log(`Getting messages for constellation: ${constellationId}`);

    // Try using the RPC function first
    try {
      const { data, error } = await supabase.rpc("get_constellation_messages", {
        constellation_id: constellationId,
      });

      if (error) {
        console.error("Error getting messages via RPC:", error);
        throw error;
      }

      console.log(`Retrieved ${data.length} messages`);
      return { data, error: null };
    } catch (rpcError) {
      console.log("Falling back to direct query");

      // Fallback to direct query with proper table aliases
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          constellation_id,
          user_id,
          content,
          image_url,
          created_at,
          profiles:user_id (name)
        `
        )
        .eq("constellation_id", constellationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error getting messages directly:", error);
        throw error;
      }

      // Transform the data to match the expected format
      const formattedData = data.map((message: any) => ({
        ...message,
        sender_name: message.profiles?.name || "Unknown",
      }));

      console.log(`Retrieved ${formattedData.length} messages`);
      return { data: formattedData, error: null };
    }
  } catch (error) {
    console.error("Error in getConstellationMessages:", error);
    return { data: [], error };
  }
};

export const sendMessage = async (
  constellationId: string,
  content: string,
  imageUrl: string | null = null
) => {
  try {
    console.log(`Sending message to constellation ${constellationId}`);

    // Try using the RPC function first
    const { data, error } = await supabase.rpc("send_message", {
      constellation_id: constellationId,
      content: content || (imageUrl ? "📷 Image" : ""),
      image_url: imageUrl,
    });

    if (error) {
      console.error("Error sending message via RPC:", error);

      // Fallback to direct insert
      const { data: insertData, error: insertError } = await supabase
        .from("messages")
        .insert({
          constellation_id: constellationId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content: content,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error sending message directly:", insertError);
        throw insertError;
      }

      console.log("Message sent successfully via direct insert");
      return {
        data: { success: true, message_id: insertData.id },
        error: null,
      };
    }

    console.log("Message sent successfully:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return { data: null, error };
  }
};

export const getPartnerProfile = async (constellationId: string) => {
  try {
    console.log(
      `Getting partner profile for constellation: ${constellationId}`
    );

    // Try using the RPC function first
    try {
      const { data, error } = await supabase.rpc("get_partner_profile", {
        constellation_id: constellationId,
      });

      if (error) {
        console.error("Error getting partner profile via RPC:", error);
        throw error;
      }

      if (data && data.success) {
        return { data: data.partner, error: null };
      } else {
        console.log("No partner found or error:", data?.error);
        return { data: null, error: data?.error || "No partner found" };
      }
    } catch (rpcError) {
      console.log("Falling back to direct query");

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
        .from("constellation_members")
        .select(
          `
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
        `
        )
        .eq("constellation_id", constellationId)
        .neq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error getting partner profile directly:", error);
        throw error;
      }

      // Cast the data to the expected type
      const typedData = data as unknown as PartnerProfileResponse;

      // Transform the data to match the expected format
      const partnerData = {
        id: typedData.profiles?.id || "",
        name: typedData.profiles?.name || "Unknown",
        bio: typedData.profiles?.about || "",
        avatar_url: typedData.profiles?.photo_url || "",
        star_name: typedData.profiles?.star_name || "",
        star_type: typedData.star_type || "navigator",
      };

      return { data: partnerData, error: null };
    }
  } catch (error) {
    console.error("Failed to get partner profile:", error);
    return { data: null, error: "Unknown error" };
  }
};

export const increaseBondingStrength = async (
  constellationId: string,
  amount: number = 1
) => {
  try {
    // Try using the RPC function first
    const { data, error } = await supabase.rpc("increase_bonding_strength", {
      constellation_id: constellationId,
      amount: amount,
    });

    if (error) {
      console.error("Error increasing bonding strength via RPC:", error);

      // Fallback to direct update
      const { data: constellationData, error: getError } = await supabase
        .from("constellations")
        .select("bonding_strength")
        .eq("id", constellationId)
        .single();

      if (getError) {
        console.error("Error getting constellation data:", getError);
        throw getError;
      }

      const currentStrength = constellationData.bonding_strength || 0;
      const newStrength = Math.min(100, currentStrength + amount);

      const { error: updateError } = await supabase
        .from("constellations")
        .update({ bonding_strength: newStrength })
        .eq("id", constellationId);

      if (updateError) {
        console.error("Error updating bonding strength directly:", updateError);
        throw updateError;
      }

      return { success: true };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in increaseBondingStrength:", error);
    return { success: false, error };
  }
};

// Helper functions
const generateInviteCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const uploadVoiceNote = async (
  constellationId: string,
  fileUri: string,
  durationMs: number
) => {
  const fileExt = fileUri.split(".").pop()?.toLowerCase() || "m4a";
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${fileExt}`;
  const path = `${constellationId}/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from("voice-notes")
    .upload(path, blob, {
      contentType: blob.type || "audio/m4a",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("voice-notes").getPublicUrl(path);

  return {
    voiceNoteUrl: data.publicUrl,
    voiceNoteDurationMs: durationMs,
  };
};

export const requestAccountDeletion = async () => {
  const { data, error } = await supabase.rpc("request_account_deletion");

  if (error) {
    throw error;
  }

  return data;
};

export const requestAccountExport = async () => {
  const { data, error } = await supabase.rpc("request_account_export");

  if (error) {
    throw error;
  }

  return data;
};

export type NotificationProvider = "onesignal";
export type NotificationPlatform = "ios" | "android";

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  updated_at?: string;
}

export const getNotificationPreferences = async () => {
  const { data, error } = await supabase.rpc("get_notification_preferences");

  if (error) {
    throw error;
  }

  return data as NotificationPreferences;
};

export const setNotificationPreferences = async (params: {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
}) => {
  const { data, error } = await supabase.rpc("set_notification_preferences", {
    p_push_enabled:
      typeof params.pushEnabled === "boolean" ? params.pushEnabled : null,
    p_email_enabled:
      typeof params.emailEnabled === "boolean" ? params.emailEnabled : null,
  });

  if (error) {
    throw error;
  }

  return data as NotificationPreferences;
};

export const registerPushDevice = async (params: {
  provider?: NotificationProvider;
  subscriptionId: string;
  platform: NotificationPlatform;
  appVersion?: string;
}) => {
  const { data, error } = await supabase.rpc("register_push_device", {
    p_provider: params.provider || "onesignal",
    p_subscription_id: params.subscriptionId,
    p_platform: params.platform,
    p_app_version: params.appVersion ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const unregisterPushDevice = async (params: {
  provider?: NotificationProvider;
  subscriptionId: string;
}) => {
  const { data, error } = await supabase.rpc("unregister_push_device", {
    p_provider: params.provider || "onesignal",
    p_subscription_id: params.subscriptionId,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const enqueuePairNotification = async (params: {
  constellationId: string;
  eventType:
    | "message_new"
    | "call_ringing"
    | "ritual_reminder"
    | "partner_joined"
    | "system";
  payload?: Record<string, any>;
}) => {
  const { data, error } = await supabase.rpc("enqueue_pair_notification", {
    target_constellation_id: params.constellationId,
    target_event_type: params.eventType,
    target_payload: params.payload ?? {},
  });

  if (error) {
    throw error;
  }

  return data;
};
