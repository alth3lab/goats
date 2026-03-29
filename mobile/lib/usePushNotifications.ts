import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { pushApi } from './api';
import { getToken } from './storage';

// Configure how notifications are presented when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  token: string | null;
  notification: Notifications.Notification | null;
}

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    // Must be a physical device
    if (!Device.isDevice) {
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2e7d32',
      });
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    return pushToken.data;
  }, []);

  useEffect(() => {
    registerForPushNotifications().then(async (t) => {
      if (t) {
        setToken(t);
        // Send token to backend if user is logged in
        const authToken = await getToken();
        if (authToken) {
          pushApi.registerExpoToken(t).catch(() => {
            // Silent fail — will retry on next app launch
          });
        }
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      setNotification(n);
    });

    // Listen for notification taps (user interaction)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(_response => {
      // Could navigate to specific screen based on notification data
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotifications]);

  return { token, notification };
}
