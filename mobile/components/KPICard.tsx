import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  gradient?: readonly string[];
  subtitle?: string;
  trend?: number;
  style?: ViewStyle;
}

export default function KPICard({ title, value, icon, iconColor = Colors.primary, gradient, subtitle, trend, style }: KPICardProps) {
  if (gradient) {
    return (
      <LinearGradient
        colors={gradient as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.gradientCard, style]}
      >
        <View style={styles.shineOverlay} />
        <View style={styles.header}>
          <View style={styles.gradientIconWrap}>
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.9)" />
          </View>
          {trend !== undefined && trend !== 0 && (
            <View style={styles.gradientTrendBadge}>
              <Ionicons
                name={trend > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color="#fff"
              />
              <Text style={styles.gradientTrendText}>
                {western(Math.abs(trend).toFixed(0))}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.gradientValue}>{value}</Text>
        <Text style={styles.gradientTitle}>{title}</Text>
        {subtitle && <Text style={styles.gradientSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    );
  }

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
              {western(Math.abs(trend).toFixed(0))}%
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
  gradientCard: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  shineOverlay: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  gradientIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  gradientTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: 2,
  },
  trendText: {
    ...Typography.small,
    fontWeight: '600',
  },
  gradientTrendText: {
    ...Typography.small,
    fontWeight: '600',
    color: '#fff',
  },
  value: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 2,
  },
  gradientValue: {
    ...Typography.h2,
    color: '#fff',
    marginBottom: 2,
  },
  title: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  gradientTitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  subtitle: {
    ...Typography.small,
    color: Colors.textLight,
    marginTop: 2,
  },
  gradientSubtitle: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
});
