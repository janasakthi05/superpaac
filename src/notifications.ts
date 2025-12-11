// src/notifications.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function registerForPushToken(rollUpper: string) {
  try {
    const appOwnership = (Constants as any)?.appOwnership ?? "unknown";

    if (appOwnership === "expo") {
      console.log("Expo Go detected → push disabled");
      return null;
    }

    if (!Device.isDevice) {
      console.log("Not a real device → push disabled");
      return null;
    }

    let Notifications: any;
    try {
      Notifications = await import("expo-notifications");
    } catch (err) {
      console.log("expo-notifications missing:", err);
      return null;
    }

    // Foreground behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    // Permissions
    let p = await Notifications.getPermissionsAsync();
    if (p.status !== "granted") {
      p = await Notifications.requestPermissionsAsync();
    }
    if (p.status !== "granted") {
      console.log("Permission not granted");
      return null;
    }

    // Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // Get Expo push token
    const tokenObj = await Notifications.getExpoPushTokenAsync();
    const token = tokenObj?.data;

    console.log("Expo Token:", token);
    if (!token) return null;

    // Save to Firestore
    await setDoc(
      doc(db, "deviceTokens", rollUpper),
      {
        token,
        platform: Platform.OS,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return token;
  } catch (err) {
    console.log("registerForPushToken error:", err);
    return null;
  }
}
