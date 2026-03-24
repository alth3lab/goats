import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  subtitle?: string;
  trend?: number; // percentage change
  style?: ViewStyle;
}

export default function KPICard({ title, value, icon, iconColor = Colors.primary, subtitle, trend, style }: KPICardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        {trend !== undefined && trend !== 0 && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? Colors.success + '15' : Colors.error + '15' }]}>
            <Ionicons
              name={trend > 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend > 0 ? Colors.success : Colors.error}
            />
            <Text style={[styles.trendText, { color: trend > 0 ? Colors.success : Colors.error }]}>
              {Math.abs(trend).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
    minWidth: 150,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 2,
  },
  trendText: {
    ...Typography.small,
    fontWeight: '600',
  },
  value: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 2,
  },
  title: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  subtitle: {
    ...Typography.small,
    color: Colors.textLight,
    marginTop: 2,
  },
});
