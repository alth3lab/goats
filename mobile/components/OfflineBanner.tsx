import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/lib/theme';
import { useNetworkStatus } from '@/lib/useNetworkStatus';

export function OfflineBanner() {
  const isConnected = useNetworkStatus();

  if (isConnected !== false) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={styles.text}>لا يوجد اتصال بالإنترنت</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  text: {
    ...Typography.smallBold,
    color: '#fff',
  },
});
