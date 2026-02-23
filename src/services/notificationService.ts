import { Platform } from "react-native";
import OneSignal from "react-native-onesignal";
import {
  registerPushDevice,
  unregisterPushDevice,
  NotificationPlatform,
} from "../utils/supabase";

const appConfig = require("../../app.json");
const appExtra = appConfig?.expo?.extra || {};
const oneSignalApi: any =
  (OneSignal as any)?.OneSignal || (OneSignal as any)?.default || OneSignal;

let isOneSignalInitialized = false;
let hasPushSubscriptionObserver = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPushPlatform = (): NotificationPlatform =>
  Platform.OS === "ios" ? "ios" : "android";

const getOneSignalAppId = () =>
  process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
  process.env.ONESIGNAL_APP_ID ||
  appExtra.onesignalAppId;

const enableOneSignalDebugLogs = () => {
  const oneSignalAny: any = oneSignalApi;

  if (typeof oneSignalAny?.Debug?.setLogLevel === "function") {
    oneSignalAny.Debug.setLogLevel(6);
    return;
  }

  if (typeof oneSignalAny?.setLogLevel === "function") {
    oneSignalAny.setLogLevel(6, 0);
  }
};

const addPushSubscriptionObserver = () => {
  if (hasPushSubscriptionObserver) {
    return;
  }

  const pushSubscription: any = oneSignalApi?.User?.pushSubscription;
  if (!pushSubscription) {
    return;
  }

  const onChange = async () => {
    await syncCurrentOneSignalPushDevice();
  };

  if (typeof pushSubscription.addObserver === "function") {
    pushSubscription.addObserver(onChange);
    hasPushSubscriptionObserver = true;
    return;
  }

  if (typeof pushSubscription.addEventListener === "function") {
    pushSubscription.addEventListener("change", onChange);
    hasPushSubscriptionObserver = true;
  }
};

const initializeOneSignalSdk = (appId: string) => {
  if (typeof oneSignalApi?.initialize === "function") {
    oneSignalApi.initialize(appId);
    return true;
  }

  if (typeof oneSignalApi?.setAppId === "function") {
    oneSignalApi.setAppId(appId);
    return true;
  }

  return false;
};

export const initializeOneSignal = async () => {
  const appId = getOneSignalAppId();

  if (!appId) {
    console.warn(
      "EXPO_PUBLIC_ONESIGNAL_APP_ID is missing. OneSignal is disabled."
    );
    return;
  }

  if (isOneSignalInitialized) {
    addPushSubscriptionObserver();
    return;
  }

  enableOneSignalDebugLogs();
  const didInitialize = initializeOneSignalSdk(appId);
  if (!didInitialize) {
    console.warn(
      "OneSignal SDK initialize API is unavailable. Push is disabled."
    );
    return;
  }

  if (typeof oneSignalApi?.Notifications?.requestPermission === "function") {
    oneSignalApi.Notifications.requestPermission(true);
  } else if (
    typeof oneSignalApi?.promptForPushNotificationsWithUserResponse ===
    "function"
  ) {
    oneSignalApi.promptForPushNotificationsWithUserResponse(() => undefined);
  }

  addPushSubscriptionObserver();
  isOneSignalInitialized = true;
};

const getCurrentSubscriptionId = async (): Promise<string | null> => {
  const pushSubscription: any = oneSignalApi?.User?.pushSubscription;

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

    if (!isOneSignalInitialized) {
      console.warn("OneSignal not initialized, skipping sync.");
      return null;
    }

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
