/**
 * 🏖️ Premium iOS Components
 * High-quality, modern iOS-style components with glassmorphism,
 * smooth animations, and native-feeling interactions
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Glass Card Component ────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: readonly [string, string, ...string[]];
  blur?: boolean;
  onPress?: () => void;
}

export function GlassCard({ children, style, gradient, blur = true, onPress }: GlassCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const content = (
    <View style={[styles.glassCard, style]}>
      {gradient && (
        <LinearGradient
          colors={gradient as any}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      {blur && Platform.OS === 'ios' && (
        <BlurView
          tint="light"
          intensity={gradient ? 20 : 80}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.glassCardContent}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <Animated.View style={animatedStyle}>{content}</Animated.View>;
}

// ─── Screen Container Component ──────────────────────────
interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({
  children,
  style,
  gradient = false,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screenContainer,
        {
          paddingTop: insets.top > 0 ? insets.top : Spacing.lg,
          paddingBottom: insets.bottom > 0 ? insets.bottom + Spacing.lg : Spacing.lg,
        },
        style,
      ]}
    >
      {gradient && (
        <LinearGradient
          colors={Gradients.mistWhite as any}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

// ─── Premium Button Component ────────────────────────────
interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PremiumButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: PremiumButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(disabled ? 0.5 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  const buttonVariantStyles = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    ghost: styles.buttonGhost,
    destructive: styles.buttonDestructive,
  };

  const textVariantStyles = {
    primary: styles.buttonTextPrimary,
    secondary: styles.buttonTextSecondary,
    ghost: styles.buttonTextGhost,
    destructive: styles.buttonTextDestructive,
  };

  const sizeStyles = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  };

  const textSizeStyles = {
    small: Typography.caption,
    medium: Typography.bodyBold,
    large: Typography.h4,
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        buttonVariantStyles[variant],
        sizeStyles[size],
        style,
        animatedStyle,
      ]}
    >
      {variant === 'primary' && !disabled && (
        <LinearGradient
          colors={Gradients.teal as any}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'primary' || variant === 'destructive'
                ? Colors.textOnPrimary
                : Colors.primary
            }
          />
        ) : (
          <>
            {icon && <View style={styles.buttonIcon}>{icon}</View>}
            <Text
              style={[
                textVariantStyles[variant],
                textSizeStyles[size],
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ─── Section Group Component (iOS List Style) ────────────
interface SectionGroupProps {
  children: React.ReactNode;
  title?: string;
  footer?: string;
  style?: ViewStyle;
}

export function SectionGroup({ children, title, footer, style }: SectionGroupProps) {
  return (
    <View style={[styles.sectionGroup, style]}>
      {title && <Text style={styles.sectionGroupTitle}>{title}</Text>}
      <View style={styles.sectionGroupContent}>
        {React.Children.map(children, (child, index) => (
          <View key={index}>
            {child}
            {index < React.Children.count(children) - 1 && (
              <View style={styles.sectionGroupDivider} />
            )}
          </View>
        ))}
      </View>
      {footer && <Text style={styles.sectionGroupFooter}>{footer}</Text>}
    </View>
  );
}

// ─── Section Item Component ──────────────────────────────
interface SectionItemProps {
  title: string;
  value?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  style?: ViewStyle;
}

export function SectionItem({
  title,
  value,
  icon,
  onPress,
  chevron = false,
  style,
}: SectionItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const content = (
    <View style={[styles.sectionItem, style]}>
      {icon && <View style={styles.sectionItemIcon}>{icon}</View>}
      <Text style={styles.sectionItemTitle}>{title}</Text>
      {value && <Text style={styles.sectionItemValue}>{value}</Text>}
      {chevron && <Text style={styles.sectionItemChevron}>›</Text>}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          animatedStyle,
          pressed && styles.sectionItemPressed,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  // Glass Card
  glassCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.glass,
    ...Shadows.md,
  },
  glassCardContent: {
    padding: Spacing.lg,
  },

  // Screen Container
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },

  // Button
  button: {
    borderRadius: Radius.button,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDestructive: {
    backgroundColor: Colors.error,
  },
  buttonTextPrimary: {
    color: Colors.textOnPrimary,
    ...Typography.bodyBold,
  },
  buttonTextSecondary: {
    color: Colors.text,
    ...Typography.bodyBold,
  },
  buttonTextGhost: {
    color: Colors.primary,
    ...Typography.bodyBold,
  },
  buttonTextDestructive: {
    color: Colors.textOnPrimary,
    ...Typography.bodyBold,
  },
  buttonSmall: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  buttonMedium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  buttonLarge: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },

  // Section Group
  sectionGroup: {
    marginVertical: Spacing.md,
  },
  sectionGroupTitle: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  sectionGroupContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  sectionGroupFooter: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  sectionGroupDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.lg,
  },

  // Section Item
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  sectionItemIcon: {
    marginRight: Spacing.md,
  },
  sectionItemTitle: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  sectionItemValue: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  sectionItemChevron: {
    ...Typography.h3,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  sectionItemPressed: {
    backgroundColor: Colors.surfaceVariant,
  },
});
