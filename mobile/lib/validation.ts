import { Alert } from 'react-native';

/** Validate a numeric input string. Returns the parsed number or null on failure. */
export function validateNumber(
  value: string,
  label: string,
  opts?: { required?: boolean; min?: number; max?: number; integer?: boolean }
): number | null {
  const { required, min = 0, max, integer } = opts || {};

  if (!value.trim()) {
    if (required) {
      Alert.alert('خطأ', `${label} مطلوب`);
      return null;
    }
    return -1; // sentinel: field empty but not required
  }

  const num = integer ? parseInt(value, 10) : parseFloat(value);
  if (isNaN(num)) {
    Alert.alert('خطأ', `${label} يجب أن يكون رقماً صحيحاً`);
    return null;
  }

  if (num < min) {
    Alert.alert('خطأ', `${label} لا يمكن أن يكون أقل من ${min}`);
    return null;
  }

  if (max !== undefined && num > max) {
    Alert.alert('خطأ', `${label} لا يمكن أن يكون أكثر من ${max}`);
    return null;
  }

  return num;
}

/** Validate a date string in YYYY-MM-DD format. Returns true if valid. */
export function validateDate(value: string, label: string, opts?: { required?: boolean; allowFuture?: boolean }): boolean {
  const { required, allowFuture = false } = opts || {};

  if (!value.trim()) {
    if (required) {
      Alert.alert('خطأ', `${label} مطلوب`);
      return false;
    }
    return true;
  }

  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) {
    Alert.alert('خطأ', `${label} يجب أن يكون بصيغة YYYY-MM-DD`);
    return false;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    Alert.alert('خطأ', `${label} تاريخ غير صالح`);
    return false;
  }

  if (!allowFuture && date > new Date()) {
    Alert.alert('خطأ', `${label} لا يمكن أن يكون في المستقبل`);
    return false;
  }

  return true;
}

/** Validate a required text field. Returns true if valid. */
export function validateRequired(value: string, label: string): boolean {
  if (!value.trim()) {
    Alert.alert('خطأ', `${label} مطلوب`);
    return false;
  }
  return true;
}
