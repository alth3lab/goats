import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function BreedingLayout() {
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
        animation: 'default',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'التربية والتكاثر', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'تفاصيل التلقيح' }} />
      <Stack.Screen name="add" options={{ title: 'تسجيل تلقيح' }} />
      <Stack.Screen name="edit" options={{ title: 'تعديل السجل' }} />
      <Stack.Screen name="births" options={{ title: 'تسجيل ولادة' }} />
    </Stack>
  );
}
