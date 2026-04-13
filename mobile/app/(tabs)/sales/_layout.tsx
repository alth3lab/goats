import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function SalesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface },
        headerTransparent: Platform.OS === 'ios',
        headerBlurEffect: 'systemChromeMaterial',
        headerTintColor: Colors.primary,
        headerTitleStyle: { ...Typography.h4, color: Colors.text },
        headerTitleAlign: 'center',
        headerBackTitle: 'رجوع',
        headerShadowVisible: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'المبيعات', headerShown: false }} />
    </Stack>
  );
}
