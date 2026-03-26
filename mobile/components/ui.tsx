import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

// ─── Button ──────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md', icon,
  loading, disabled, style, fullWidth,
}: ButtonProps) {
  const bgColor = {
    primary: Colors.primary,
    secondary: Colors.secondary,
    outline: 'transparent',
    danger: Colors.error,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#fff',
    secondary: '#fff',
    outline: Colors.primary,
    danger: '#fff',
    ghost: Colors.primary,
  }[variant];

  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';

  const paddingV = { sm: 8, md: 12, lg: 16 }[size];
  const paddingH = { sm: 14, md: 20, lg: 28 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: disabled ? Colors.border : bgColor,
          borderColor: disabled ? Colors.border : borderColor,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        fullWidth && { width: '100%' },
        variant === 'outline' && { borderWidth: 1.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={fontSize + 3} color={textColor} style={{ marginStart: 6 }} />}
          <Text style={[styles.buttonText, { color: textColor, fontSize }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ───────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, icon, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrap, error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={20} color={Colors.textSecondary} style={styles.inputIcon} />
        )}
        <TextInput
          style={[styles.input, { textAlign: 'right' }, style as TextStyle]}
          placeholderTextColor={Colors.textLight}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon} size={64} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {action && (
        <Button title={action.title} onPress={action.onPress} variant="outline" size="sm" style={{ marginTop: Spacing.lg }} />
      )}
    </View>
  );
}

// ─── Loading Screen ──────────────────────────────────────
export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: { title: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.title}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Alert Banner ────────────────────────────────────────
interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  onDismiss?: () => void;
}

export function AlertBanner({ type, message, onDismiss }: AlertBannerProps) {
  const colors = {
    info: Colors.info,
    warning: Colors.warning,
    error: Colors.error,
    success: Colors.success,
  };
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    info: 'information-circle',
    warning: 'warning',
    error: 'alert-circle',
    success: 'checkmark-circle',
  };

  return (
    <View style={[styles.alertBanner, { backgroundColor: colors[type] + '12', borderColor: colors[type] + '30' }]}>
      <Ionicons name={icons[type]} size={20} color={colors[type]} />
      <Text style={[styles.alertText, { color: colors[type] }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={18} color={colors[type]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible, title, message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء',
  variant = 'primary', onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <Button title={cancelLabel} onPress={onCancel} variant="ghost" size="sm" style={{ flex: 1 }} />
            <Button title={confirmLabel} onPress={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  button: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },

  // Input
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.captionBold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginStart: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    marginTop: 4,
    textAlign: 'right',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  emptyMessage: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
  },
  sectionAction: {
    ...Typography.captionBold,
    color: Colors.primary,
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertText: {
    ...Typography.caption,
    flex: 1,
    textAlign: 'right',
  },

  // Modal / Confirm Dialog
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 360,
    ...Shadows.lg,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
