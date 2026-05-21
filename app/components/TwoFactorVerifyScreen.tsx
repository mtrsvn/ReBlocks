import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView
} from "react-native";
import * as Haptics from "expo-haptics";
import { useApp, useTheme } from "../context";
import * as OTPAuth from "otpauth";

interface TwoFactorVerifyScreenProps {
  onUnlock: () => void;
  onLogout: () => void;
}

export function TwoFactorVerifyScreen({ onUnlock, onLogout }: TwoFactorVerifyScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { userProfile } = useApp();
  const theme = useTheme();

  const handleCodeChange = (newCode: string) => {
    // Only allow numbers
    const numericCode = newCode.replace(/[^0-9]/g, '');
    setCode(numericCode);
    setError("");

    if (numericCode.length === 6) {
      verifyCode(numericCode);
    }
  };

  const verifyCode = (enteredCode: string) => {
    setLoading(true);
    
    // Slight delay for UX
    setTimeout(() => {
      if (userProfile?.totpSecret) {
        const totp = new OTPAuth.TOTP({
          issuer: "ReBlocks",
          label: userProfile.email || "User",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(userProfile.totpSecret),
        });

        const delta = totp.validate({ token: enteredCode, window: 1 });

        if (delta !== null) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onUnlock();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError("Incorrect verification code.");
          setCode("");
          setLoading(false);
        }
      } else {
        // Fallback if totpSecret is somehow missing but 2FA is enabled
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    }, 500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Two-Factor Auth
          </Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code from your authenticator app to continue.
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            value={code}
            onChangeText={handleCodeChange}
            style={[
              styles.codeInput, 
              { 
                backgroundColor: theme.surface, 
                borderColor: error ? '#ef4444' : theme.border, 
                color: theme.text 
              }
            ]}
            placeholder="000000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={true}
            editable={!loading}
          />
          
          <View style={{ height: 24, marginTop: 16, alignItems: 'center' }}>
            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}
            {loading ? <ActivityIndicator size="small" color="#10B981" /> : null}
          </View>
        </View>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  inputSection: {
    width: "100%",
    paddingHorizontal: 40,
    alignItems: "center",
  },
  codeInput: {
    width: '100%',
    height: 80,
    borderWidth: 2,
    borderRadius: 16,
    fontSize: 40,
    textAlign: 'center',
    letterSpacing: 16,
    fontWeight: '700',
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  logoutBtn: {
    padding: 16,
  },
  logoutText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
});
