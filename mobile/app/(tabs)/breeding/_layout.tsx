import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function BreedingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
        headerBackTitle: '',
        animation: 'slide_from_left',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'التربية والتكاثر' }} />
      <Stack.Screen name="[id]" options={{ title: 'تفاصيل التلقيح' }} />
      <Stack.Screen name="add" options={{ title: 'تسجيل تلقيح' }} />
      <Stack.Screen name="edit" options={{ title: 'تعديل السجل' }} />
      <Stack.Screen name="births" options={{ title: 'تسجيل ولادة' }} />
    </Stack>
  );
}
