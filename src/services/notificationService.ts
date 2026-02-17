import { Platform } from "react-native";
import OneSignal from "react-native-onesignal";
import {
  registerPushDevice,
  unregisterPushDevice,
  NotificationPlatform,
} from "../utils/supabase";

let isOneSignalInitialized = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPushPlatform = (): NotificationPlatform =>
  Platform.OS === "ios" ? "ios" : "android";

const getOneSignalAppId = () => process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

export const initializeOneSignal = async () => {
  const appId = getOneSignalAppId();

  if (!appId) {
    console.warn(
      "EXPO_PUBLIC_ONESIGNAL_APP_ID is missing. OneSignal is disabled."
    );
    return;
  }

  if (isOneSignalInitialized) {
    return;
  }

  OneSignal.initialize(appId);
  OneSignal.Notifications.requestPermission(true);
  isOneSignalInitialized = true;
};

const getCurrentSubscriptionId = async (): Promise<string | null> => {
  const pushSubscription: any = (OneSignal as any)?.User?.pushSubscription;

  if (!pushSubscription) {
    return null;
  }

  if (typeof pushSubscription.getIdAsync === "function") {
    const id = await pushSubscription.getIdAsync();
    return typeof id === "string" && id.length > 0 ? id : null;
  }

  if (
    typeof pushSubscription.id === "string" &&
    pushSubscription.id.length > 0
  ) {
    return pushSubscription.id;
  }

  return null;
};

export const syncCurrentOneSignalPushDevice = async () => {
  try {
    await initializeOneSignal();

    let subscriptionId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      subscriptionId = await getCurrentSubscriptionId();
      if (subscriptionId) {
        break;
      }

      await sleep(1200);
    }

    if (!subscriptionId) {
      return null;
    }

    return await registerPushDevice({
      provider: "onesignal",
      subscriptionId,
      platform: getPushPlatform(),
    });
  } catch (error) {
    console.error("Failed to sync OneSignal push device:", error);
    return null;
  }
};

export const unregisterCurrentOneSignalPushDevice = async () => {
  try {
    if (!isOneSignalInitialized) {
      return null;
    }

    const subscriptionId = await getCurrentSubscriptionId();
    if (!subscriptionId) {
      return null;
    }

    return await unregisterPushDevice({
      provider: "onesignal",
      subscriptionId,
    });
  } catch (error) {
    console.error("Failed to unregister OneSignal push device:", error);
    return null;
  }
};
