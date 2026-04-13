import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Image, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadows, StatusColors, StatusLabels, GenderLabels } from '@/lib/theme';
import { western } from '@/lib/formatters';
import type { Goat } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GoatCardProps {
  goat: Goat;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function GoatCard({ goat, onPress, style }: GoatCardProps) {
  const statusColor = StatusColors[goat.status] || Colors.textSecondary;
  const genderIcon = goat.gender === 'MALE' ? 'male' : 'female';
  const genderColor = goat.gender === 'MALE' ? Colors.male : Colors.female;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 400, damping: 20 });
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  const a11yLabel = `${goat.name || goat.tagId}، ${GenderLabels[goat.gender]}، ${StatusLabels[goat.status] || goat.status}`;

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.cardRow}>
        {/* Thumbnail */}
        {(goat.imageUrl || goat.thumbnail) ? (
          <Image source={{ uri: goat.imageUrl || goat.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="paw" size={22} color={Colors.textLight} />
          </View>
        )}
        <View style={styles.cardContent}>
      {/* Tag & Status Row */}
      <View style={styles.topRow}>
        <View style={styles.tagWrap}>
          <View style={[styles.tagDot, { backgroundColor: goat.tagColor || Colors.primary }]} />
          <Text style={styles.tagId}>{goat.tagId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {StatusLabels[goat.status] || goat.status}
          </Text>
        </View>
      </View>

      {/* Name & Gender */}
      {goat.name && <Text style={styles.name}>{goat.name}</Text>}
      
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name={genderIcon} size={16} color={genderColor} />
          <Text style={styles.infoText}>{GenderLabels[goat.gender]}</Text>
        </View>

        {goat.breed && (
          <View style={styles.infoItem}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{goat.breed.nameAr}</Text>
          </View>
        )}

        {goat.age && (
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{goat.age.formatted}</Text>
          </View>
        )}
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        {goat.pen && (
          <View style={styles.infoChip}>
            <Ionicons name="home-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.chipText}>{goat.pen.nameAr}</Text>
          </View>
        )}
        {goat.weight && (
          <View style={styles.infoChip}>
            <Ionicons name="fitness-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.chipText}>{western(goat.weight)} كغ</Text>
          </View>
        )}
        {goat.pregnancyStatus && (
          <View style={[styles.infoChip, { backgroundColor: Colors.female + '15' }]}>
            <Ionicons name="heart" size={12} color={Colors.female} />
            <Text style={[styles.chipText, { color: Colors.female }]}>حامل</Text>
          </View>
        )}
      </View>
      </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagId: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
  },
  name: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  chipText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
});
