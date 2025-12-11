// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import type { NotificationBehavior } from "expo-notifications";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Foreground handler
        Notifications.setNotificationHandler({
          handleNotification: async (): Promise<NotificationBehavior> => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        console.log("Notification handler installed.");

        // Listener: app in foreground
        const sub1 = Notifications.addNotificationReceivedListener((notification) => {
          console.log("🔔 Foreground notification:", notification);
        });

        // Listener: user taps notification
        const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          console.log("👉 Notification clicked:", data);

          // Navigation when tapping notification
          if (data?.screen === "chat" && data?.chatId) {
            router.push(`/chat/${data.chatId}` as any);
          }
        });

        return () => {
          sub1.remove();
          sub2.remove();
        };
      } catch (err) {
        console.warn("expo-notifications missing:", err);
      }
    })();
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
