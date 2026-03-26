import '@/lib/polyfills';
import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { OfflineBanner } from '@/components/OfflineBanner';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { Colors } from '@/lib/theme';

// Force RTL for Arabic — takes effect after app restart
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" backgroundColor={Colors.primaryDark} />
          <OfflineBanner />
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  // Register push notifications (runs once)
  usePushNotifications();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'default',
      }}
    />
  );
}

// Error Boundary to catch runtime crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>حدث خطأ</Text>
          <Text style={errStyles.message}>{this.state.error?.message}</Text>
          <Text style={errStyles.hint}>أعد تشغيل التطبيق</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F5F1', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#C96A6A', marginBottom: 12 },
  message: { fontSize: 14, color: '#223028', textAlign: 'center', marginBottom: 20 },
  hint: { fontSize: 14, color: '#5F6B64' },
});
