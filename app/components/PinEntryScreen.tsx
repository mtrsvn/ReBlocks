import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Delete } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp, useTheme } from "../context";

interface PinEntryScreenProps {
  onUnlock: () => void;
  onLogout: () => void;
  forRemoval?: boolean;
}

export function PinEntryScreen({ onUnlock, onLogout, forRemoval = false }: PinEntryScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const { userProfile, updateUserProfile } = useApp();
  const theme = useTheme();

  useEffect(() => {
    if (userProfile?.isLocked && userProfile?.lockedUntil) {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [userProfile?.isLocked, userProfile?.lockedUntil]);

  const isAccountLocked = () => {
    if (userProfile?.isLocked && userProfile.lockedUntil) {
      const lockEnd = new Date(userProfile.lockedUntil).getTime();
      return lockEnd > now;
    }
    return false;
  };

  const getLockTimeRemaining = () => {
    if (!userProfile?.lockedUntil) return "";
    const lockEnd = new Date(userProfile.lockedUntil).getTime();
    const diff = lockEnd - now;
    if (diff <= 0) return "";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadPin = async () => {
      // Load PIN from Firestore (userProfile.userPin)
      if (userProfile?.userPin) {
        setStoredPin(userProfile.userPin.toString());
      } else {
        setStoredPin(null);
      }
    };
    loadPin();
  }, [userProfile?.userPin]);

  const handlePress = (num: string) => {
    if (isAccountLocked()) {
      setError(`Access is suspended. Try again in ${getLockTimeRemaining()}.`);
      return;
    }
    if (pin.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPin = pin + num;
      setPin(newPin);
      setError("");

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin(pin.slice(0, -1));
      setError("");
    }
  };

  const verifyPin = async (enteredPin: string) => {
    if (isAccountLocked()) {
      setError(`Access is suspended. Try again in ${getLockTimeRemaining()}.`);
      setPin("");
      return;
    }

    setLoading(true);
    
    // Slight delay for UX
    setTimeout(async () => {
      if (storedPin) {
        if (enteredPin === storedPin) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if ((userProfile?.pinAttempt || 0) > 0 || userProfile?.isLocked) {
            await updateUserProfile({ pinAttempt: 0, isLocked: false, lockedUntil: null });
          }
          onUnlock();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          
          let currentAttempts = userProfile?.pinAttempt || 0;
          if (userProfile?.isLocked && userProfile.lockedUntil) {
            const lockEnd = new Date(userProfile.lockedUntil).getTime();
            if (Date.now() >= lockEnd) {
              currentAttempts = 0;
            }
          }
          const attempts = currentAttempts + 1;
          
          if (attempts >= 3) {
            const unlockTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await updateUserProfile({ pinAttempt: attempts, isLocked: true, lockedUntil: unlockTime });
            setError("Access temporarily suspended. Please try again in 60:00.");
          } else {
            await updateUserProfile({ pinAttempt: attempts });
            setError(`Incorrect PIN. ${3 - attempts} attempt${3 - attempts !== 1 ? 's' : ''} remaining.`);
          }
          
          setPin("");
          setLoading(false);
        }
      } else {
        // Fallback: If for some reason Firestore says true but local storage has no PIN.
        // For development, we just unlock it so they can reset it in the profile screen.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    }, 500);
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length > i && styles.dotActive,
              error.length > 0 && styles.dotError,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const rows = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "delete"],
    ];

    return (
      <View style={[styles.keypad, isAccountLocked() && { opacity: 0.3 }]} pointerEvents={isAccountLocked() ? "none" : "auto"}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key, colIndex) => {
              if (key === "") {
                return <View key={colIndex} style={{ width: 72, height: 72 }} />;
              }
              if (key === "delete") {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[styles.key, { backgroundColor: theme.surface }]}
                    onPress={handleDelete}
                    disabled={loading}
                  >
                    <Delete size={28} color={theme.icon} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[styles.key, { backgroundColor: theme.surface }]}
                  onPress={() => handlePress(key)}
                  disabled={loading}
                >
                  <Text style={[styles.keyText, { color: theme.text }]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isAccountLocked() ? "Access Suspended" : forRemoval ? "Remove PIN" : "Enter Security PIN"}
          </Text>
          <Text style={styles.subtitle}>
            {isAccountLocked() 
              ? `For your security, access has been temporarily suspended due to multiple unsuccessful attempts. Please try again in ${getLockTimeRemaining()}.` 
              : forRemoval
              ? "Enter your 4-digit PIN to confirm removal"
              : "Please enter your 4-digit PIN to unlock ReBlocks."}
          </Text>
        </View>

        <View style={styles.pinSection}>
          {!isAccountLocked() && renderDots()}
          <View style={{ height: 24, marginTop: 16 }}>
            {error || isAccountLocked() ? (
              <Text style={styles.errorText}>
                {error || `Access is suspended. Try again in ${getLockTimeRemaining()}.`}
              </Text>
            ) : null}
            {loading ? <ActivityIndicator size="small" color="#10B981" /> : null}
          </View>
        </View>

        <View style={styles.keypadSection}>{renderKeypad()}</View>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>{forRemoval ? "Cancel" : "Log out instead"}</Text>
        </TouchableOpacity>
      </View>
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
  pinSection: {
    alignItems: "center",
    marginVertical: 40,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  dotActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  dotError: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  keypadSection: {
    width: "100%",
    paddingHorizontal: 40,
  },
  keypad: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  keyText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1e293b",
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
