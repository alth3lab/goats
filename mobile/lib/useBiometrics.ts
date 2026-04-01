import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import {
  getBiometricEnabled,
  setBiometricEnabled,
  getBiometricIdentifier,
  setBiometricIdentifier,
} from './storage';

export type BiometricType = 'face' | 'fingerprint' | 'none';

/** Returns whether the device supports biometrics and what type is available */
export async function getAvailableBiometric(): Promise<BiometricType> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'none';

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return 'none';

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
      (Platform.OS === 'ios' && types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
    ) {
      // On iOS, Face ID is FACIAL_RECOGNITION; Touch ID is FINGERPRINT
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'face';
      }
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/** Prompt the biometric authentication dialog. Returns true if approved. */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'إلغاء',
      disableDeviceFallback: false,
      fallbackLabel: 'استخدم كلمة المرور',
    });
    return result.success;
  } catch {
    return false;
  }
}

export {
  getBiometricEnabled,
  setBiometricEnabled,
  getBiometricIdentifier,
  setBiometricIdentifier,
};
