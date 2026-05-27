import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import {
  ChevronRight,
  Shield,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Lock,
  Eye,
  User,
  Plus,
  Building2,
  Moon,
  Key,
  Trash2,
  Star,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, useTheme } from "../context";
import { AnimatedButton } from "./AnimatedButton";
import { BottomSheet } from "./BottomSheet";
import { PinEntryScreen } from "./PinEntryScreen";
import * as Haptics from "expo-haptics";
import { sendPasswordResetEmail, signInWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import QRCode from "react-native-qrcode-svg";
import * as OTPAuth from "otpauth";

interface ProfileScreenProps {
  onLogout?: () => void;
  onPinRemovalShow?: (show: boolean) => void;
}

export function ProfileScreen({ onLogout, onPinRemovalShow }: ProfileScreenProps) {
  const { fundingSources, defaultCurrency, setDefaultCurrency, userProfile, updateUserProfile, darkMode, setDarkMode, addFundingSource, deleteFundingSource, primaryPaymentId, setPrimaryPaymentId, transactions } = useApp();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // States for KYC modal
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [showPinRemovalEntry, setShowPinRemovalEntry] = useState(false);

  // States for password verification
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // States for Add Payment Method
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCVV, setNewCardCVV] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  // Card detail sheet
  const [selectedCard, setSelectedCard] = useState<import('../context').FundingSource | null>(null);
  const [editCardName, setEditCardName] = useState('');

  // Detect card network from first digits
  const detectCardNetwork = (num: string): { name: string; type: 'card' } => {
    const raw = num.replace(/\s/g, '');
    if (/^4/.test(raw)) return { name: 'Visa', type: 'card' };
    if (/^5[1-5]/.test(raw) || /^2[2-7]/.test(raw)) return { name: 'Mastercard', type: 'card' };
    if (/^3[47]/.test(raw)) return { name: 'Amex', type: 'card' };
    if (/^35/.test(raw)) return { name: 'JCB', type: 'card' };
    return { name: 'Card', type: 'card' };
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  // Profile data values loaded from userProfile
  const name = userProfile?.fullName || "Carlos Mendoza";
  const address = userProfile?.address || "123 Metro Manila, Philippines";
  const birthday = userProfile?.birthday || "1995-10-12";
  const phone = userProfile?.phone || "+63 912 345 6789";
  const email = userProfile?.email || "carlos.mendoza@email.com";
  const isVerified = userProfile?.KYCVerified || false;
  
  const hasPin = userProfile?.pin || false;
  
  // Calculate transfer stats
  const totalTransfers = transactions.filter(t => t.type === 'send').length;
  const totalReceived = transactions.filter(t => t.type === 'receive').length;
  const pinSetupAt = userProfile?.pinsetup || null;

  let pinSublabel = "Enhance your security";
  if (hasPin) {
    if (pinSetupAt) {
      const days = Math.floor((new Date().getTime() - new Date(pinSetupAt).getTime()) / (1000 * 3600 * 24));
      pinSublabel = `Last changed ${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      pinSublabel = "PIN is active";
    }
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y <= -55 && !refreshing) {
      onRefresh();
    }
  };
  const [notifications, setNotifications] = useState(userProfile?.notifications ?? true);
  
  useEffect(() => {
    if (userProfile && userProfile.notifications !== undefined) {
      setNotifications(userProfile.notifications);
    }
  }, [userProfile?.notifications]);

  const [twoFactor, setTwoFactor] = useState(userProfile?.twoFactorEnabled ?? false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [biometric, setBiometric] = useState(userProfile?.biometricEnabled ?? false);

  useEffect(() => {
    if (userProfile && userProfile.biometricEnabled !== undefined) {
      setBiometric(userProfile.biometricEnabled);
    }
  }, [userProfile?.biometricEnabled]);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [totpError, setTotpError] = useState("");

  useEffect(() => {
    if (userProfile && userProfile.twoFactorEnabled !== undefined) {
      setTwoFactor(userProfile.twoFactorEnabled);
    }
  }, [userProfile?.twoFactorEnabled]);

  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);

  const [tempName, setTempName] = useState(name);
  const [tempBirthdayDate, setTempBirthdayDate] = useState(() => {
    try {
      return birthday ? new Date(birthday) : new Date(1995, 9, 12);
    } catch {
      return new Date(1995, 9, 12);
    }
  });
  const [tempPhone, setTempPhone] = useState(phone);

  useEffect(() => {
    if (userProfile) {
      setTempName(userProfile.fullName || "");
      try {
        setTempBirthdayDate(userProfile.birthday ? new Date(userProfile.birthday) : new Date(1995, 9, 12));
      } catch {
        setTempBirthdayDate(new Date(1995, 9, 12));
      }
      setTempPhone(userProfile.phone || "");
    }
  }, [userProfile]);

  const settingSections: {
    title: string;
    items: {
      icon: any;
      label: string;
      sublabel: string;
      color: string;
      badge?: string;
      toggle?: boolean;
      toggleVal?: boolean;
      onToggle?: (val: boolean) => void;
      onPress?: () => void;
    }[];
  }[] = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Personal Information",
          sublabel: `${name} · ${birthday}`,
          color: "#10B981",
          onPress: () => {
            setTempName(name);
            try {
              setTempBirthdayDate(birthday ? new Date(birthday) : new Date(1995, 9, 12));
            } catch {
              setTempBirthdayDate(new Date(1995, 9, 12));
            }
            setShowPersonalInfo(true);
          },
        },
        {
          icon: Phone,
          label: "Phone Number",
          sublabel: phone,
          color: "#10B981",
          onPress: () => {
            setShowPhone(true);
          },
        },
        {
          icon: Mail,
          label: "Email Address",
          sublabel: email,
          color: "#10B981",
          onPress: () => {
            setShowEmail(true);
          },
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: Key,
          label: "Reset Password",
          sublabel: "Send reset link to email",
          color: "#10B981",
          onPress: async () => {
            if (!userProfile?.email) {
              Alert.alert("Error", "Email not found in your profile.");
              return;
            }
            try {
              await sendPasswordResetEmail(auth, userProfile.email);
              Alert.alert("Success", `Password reset link sent to ${userProfile.email}`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to send reset email.");
            }
          },
        },
        {
          icon: Lock,
          label: hasPin ? "Change PIN" : "Setup your PIN",
          sublabel: pinSublabel,
          color: "#10B981",
          onPress: () => {
            setPendingAction("pin");
            setPasswordInput("");
            setPasswordError("");
            setShowPasswordModal(true);
          },
        },
        {
          icon: Shield,
          label: "Two-Factor Auth",
          sublabel: "Authenticator App",
          color: "#10B981",
          toggle: true,
          toggleVal: twoFactor,
          onToggle: (val: boolean) => {
            if (val) {
              setPendingAction("2fa");
              setPasswordInput("");
              setPasswordError("");
              setShowPasswordModal(true);
            } else {
              Alert.alert("Disable 2FA", "Are you sure you want to disable Two-Factor Authentication?", [
                { text: "Cancel", style: "cancel" },
                { text: "Disable", style: "destructive", onPress: async () => {
                  await updateUserProfile({ twoFactorEnabled: false, totpSecret: "" });
                  setTwoFactor(false);
                }}
              ]);
            }
          },
        },
        {
          icon: Eye,
          label: "Biometric Login",
          sublabel: "Face ID / Touch ID",
          color: "#3b82f6",
          toggle: true,
          toggleVal: biometric,
          onToggle: async (val: boolean) => {
            if (val) {
              setPendingAction("biometric");
              setPasswordInput("");
              setPasswordError("");
              setShowPasswordModal(true);
            } else {
              setBiometric(val);
              await updateUserProfile({ biometricEnabled: val });
            }
          },
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          sublabel: "Transfers, promotions",
          color: "#10B981",
          toggle: true,
          toggleVal: notifications,
          onToggle: async (val: boolean) => {
            setNotifications(val);
            try {
              await updateUserProfile({ notifications: val });
            } catch (error) {
              setNotifications(!val);
              Alert.alert("Error", "Failed to update notification settings.");
            }
          },
        },
        {
          icon: Moon,
          label: "Dark Mode",
          sublabel: "Enable premium dark theme",
          color: "#10B981",
          toggle: true,
          toggleVal: darkMode,
          onToggle: (val: boolean) => {

            setDarkMode(val);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },

        {
          icon: HelpCircle,
          label: "Help & Support",
          sublabel: "FAQs, contact us",
          color: "#10B981",
          onPress: () => setShowHelpSupport(true),
        },
      ],
    },
  ];

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      {refreshing && (
        <View style={[styles.topRefreshContainer, { backgroundColor: theme.surface }]}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        alwaysBounceVertical={true}
      >
        
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        </View>

        
        <View style={[styles.flatCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.profileHeaderRow}>
            
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
            </View>

            
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.text }]}>{name}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.verifiedBadge, { backgroundColor: isVerified ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" }]}>
                  <CheckCircle size={10} color={isVerified ? "#10B981" : "#ef4444"} style={{ marginRight: 3 }} />
                  <Text style={[styles.verifiedText, !isVerified && { color: "#ef4444" }]}>
                    {isVerified ? "VERIFIED" : "UNVERIFIED"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          
          <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

          
          <View style={styles.statsGrid}>
            {[
              { label: "Transfers", value: totalTransfers.toString() },
              { label: "Member Since", value: userProfile?.createdAt ? new Date(userProfile.createdAt).getFullYear().toString() : "2024" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.statCol}>
                <Text style={[styles.statVal, { color: theme.text }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!isVerified) {
              setShowKycModal(true);
            }
          }}
        >
          <LinearGradient
            colors={isVerified ? ["#10B981", "#059669"] : ["#ef4444", "#dc2626"]}
            style={styles.kycBanner}
          >
            <View style={styles.kycIconWrapper}>
              <Shield size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycTitle}>KYC Identity Verification</Text>
              <Text style={styles.kycSub}>
                {isVerified 
                  ? "Your account is fully secured and verified."
                  : "Tap to verify your ID to secure your account"}
              </Text>
            </View>
            <View style={[styles.kycBadge, { backgroundColor: theme.background }]}>
              <Text style={styles.kycBadgeText}>
                {isVerified ? "✓ Verified" : "⚠️ Start"}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>



        
        {settingSections.map((section) => (
          <View key={section.title} style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={[styles.flatCardGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {section.items.map((item, i) => {
                const Icon = item.icon;
                const isLast = i === section.items.length - 1;
                return (
                  <View key={item.label}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={item.toggle !== undefined}
                      onPress={item.onPress}
                    >
                      <View style={styles.settingItemRow}>
                        <View style={styles.settingItemIconWrapper}>
                          <Icon size={16} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.settingItemLabel, { color: theme.text }]}>{item.label}</Text>
                          <Text style={styles.settingItemSub}>{item.sublabel}</Text>
                        </View>

                        {item.toggle ? (
                          <Switch
                            value={item.toggleVal}
                            onValueChange={item.onToggle}
                            trackColor={{ false: "#cbd5e1", true: "#10B981" }}
                            thumbColor="#ffffff"
                            ios_backgroundColor="#cbd5e1"
                          />
                        ) : item.badge ? (
                          <View style={[styles.smsBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                            <Text style={[styles.smsBadgeText, { color: "#10B981" }]}>{item.badge}</Text>
                          </View>
                        ) : (
                          <ChevronRight size={16} color="#b0b8c8" />
                        )}
                      </View>
                    </TouchableOpacity>
                    {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        
        <AnimatedButton
          style={[styles.signOutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => {
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: () => {
                if (onLogout) onLogout();
              }}
            ]);
          }}
        >
          <LogOut size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </AnimatedButton>

        
        <Text style={styles.versionText}>v0.1.0-dev · ReBlocks Development Phase</Text>
      </ScrollView>

      
      {/* Card Detail BottomSheet */}
      <BottomSheet
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title="Card Details"
      >
        {selectedCard && (() => {
          const isPrimary = selectedCard.id === primaryPaymentId;
          return (
            <View style={styles.modalForm}>
              {/* Card info header */}
              <View style={[styles.flatCardRow, { backgroundColor: theme.background, marginBottom: 8 }]}>
                <View style={styles.methodIconWrapper}>
                  {selectedCard.type === 'bank'
                    ? <Building2 size={18} color="#10B981" />
                    : <CreditCard size={18} color="#10B981" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodName, { color: theme.text }]}>{selectedCard.provider}</Text>
                  <Text style={styles.methodSub}>•••• •••• •••• {selectedCard.last4}</Text>
                </View>
                {isPrimary && (
                  <View style={[styles.activeStatusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.activeStatusText, { color: '#10B981' }]}>PRIMARY</Text>
                  </View>
                )}
              </View>

              {/* Editable name */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>CARD NICKNAME</Text>
                <TextInput
                  value={editCardName}
                  onChangeText={setEditCardName}
                  placeholder="e.g. My Daily Card"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                />
              </View>

              {/* Set as Primary button */}
              {!isPrimary && (
                <TouchableOpacity
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    await setPrimaryPaymentId(selectedCard.id);
                    setSelectedCard(null);
                  }}
                  style={[styles.primarySaveBtn, { marginTop: 4 }]}
                >
                  <View style={[styles.primarySaveBtnGradient, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={[styles.primarySaveBtnText, { color: '#10B981' }]}>Set as Primary</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Save name button */}
              <TouchableOpacity
                onPress={async () => {
                  if (editCardName.trim() && editCardName.trim() !== selectedCard.name) {
                    // Update name in Firebase
                    const { doc, updateDoc } = await import('firebase/firestore');
                    const { db } = await import('../firebase');
                    const { auth } = await import('../firebase');
                    if (auth.currentUser) {
                      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'fundingSources', selectedCard.id), { name: editCardName.trim() });
                    }
                  }
                  setSelectedCard(null);
                }}
                style={[styles.primarySaveBtn, { marginTop: 12 }]}
              >
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.primarySaveBtnGradient}>
                  <Text style={styles.primarySaveBtnText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Remove */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Remove Card",
                    `Remove "${selectedCard.name}"?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove", style: "destructive",
                        onPress: () => {
                          deleteFundingSource(selectedCard.id);
                          setSelectedCard(null);
                        }
                      },
                    ]
                  );
                }}
                style={[styles.primarySaveBtn, { marginTop: 4 }]}
              >
                <View style={[styles.primarySaveBtnGradient, { backgroundColor: 'rgba(239,68,68,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                  <Trash2 size={14} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.primarySaveBtnText, { color: '#ef4444' }]}>Remove Card</Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })()}
      </BottomSheet>

      {/* Add Payment Method BottomSheet */}
      <BottomSheet
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        title="Add Your Card"
      >
        <View style={styles.modalForm}>

          {/* Card Number */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>CARD NUMBER</Text>
            <TextInput
              value={newCardNumber}
              onChangeText={(v) => setNewCardNumber(formatCardNumber(v))}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              maxLength={19}
              style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, letterSpacing: 2 }]}
            />
          </View>

          {/* Expiry + CVV row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.modalInputGroup, { flex: 1 }]}>
              <Text style={styles.modalLabel}>EXPIRY DATE</Text>
              <TextInput
                value={newCardExpiry}
                onChangeText={(v) => setNewCardExpiry(formatExpiry(v))}
                placeholder="MM/YY"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              />
            </View>
            <View style={[styles.modalInputGroup, { flex: 1 }]}>
              <Text style={styles.modalLabel}>CVV</Text>
              <TextInput
                value={newCardCVV}
                onChangeText={(v) => setNewCardCVV(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              />
            </View>
          </View>

          {/* Card Label */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>NAME THIS CARD</Text>
            <TextInput
              value={newCardName}
              onChangeText={setNewCardName}
              placeholder="e.g. My Daily Card, Travel Card..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={async () => {
              const rawNum = newCardNumber.replace(/\s/g, '');
              if (rawNum.length < 13) { Alert.alert('Invalid Card', 'Please enter a valid card number.'); return; }
              if (!newCardExpiry.includes('/') || newCardExpiry.length < 5) { Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY).'); return; }
              if (newCardCVV.length < 3) { Alert.alert('Invalid CVV', 'Please enter a valid CVV.'); return; }
              const label = newCardName.trim() || detectCardNetwork(newCardNumber).name + ' Card';
              const net = detectCardNetwork(newCardNumber);
              const last4 = rawNum.slice(-4);
              setAddingCard(true);
              try {
                await addFundingSource({
                  name: label,
                  type: net.type,
                  last4,
                  accountNumber: `•••• •••• •••• ${last4}`,
                  provider: net.name,
                  gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowAddPayment(false);
              } catch (e) {
                Alert.alert('Error', 'Failed to add card. Try again.');
              } finally {
                setAddingCard(false);
              }
            }}
            style={[styles.primarySaveBtn, { opacity: addingCard ? 0.6 : 1 }]}
            disabled={addingCard}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.primarySaveBtnGradient}>
              {addingCard
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.primarySaveBtnText}>Save Card</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showPersonalInfo}
        onClose={() => setShowPersonalInfo(false)}
        title="Personal Information"
      >
        <View style={styles.modalForm}>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>FULL NAME</Text>
            <View style={[styles.modalValueBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.modalValueText, { color: theme.text }]}>{tempName}</Text>
            </View>
          </View>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>DATE OF BIRTH</Text>
            <View style={[styles.modalValueBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.modalValueText, { color: theme.text }]}>
                {tempBirthdayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showTwoFactorSetup}
        onClose={() => setShowTwoFactorSetup(false)}
        title="Setup Authenticator App"
      >
        <View style={styles.modalForm}>
          <Text style={[styles.modalLabel, { marginBottom: 16, textAlign: 'center', lineHeight: 20 }]}>
            1. Scan this QR Code with your Authenticator App (Google Authenticator, Authy, etc.)
          </Text>
          <View style={{ alignItems: 'center', marginBottom: 24, backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
            {totpUri ? <QRCode value={totpUri} size={200} /> : null}
          </View>
          <Text style={[styles.modalLabel, { marginBottom: 8 }]}>
            2. Enter the 6-digit code to verify
          </Text>
          <TextInput
            value={totpVerifyCode}
            onChangeText={setTotpVerifyCode}
            style={[styles.modalInput, { backgroundColor: theme.background, borderColor: totpError ? '#ef4444' : theme.border, color: theme.text, fontSize: 24, textAlign: 'center', letterSpacing: 8 }]}
            placeholder="000000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
          />
          {totpError ? <Text style={{ color: '#ef4444', marginTop: 8, textAlign: 'center' }}>{totpError}</Text> : null}

          <TouchableOpacity
            style={[styles.modalSaveBtnWrapper, { marginTop: 24 }]}
            onPress={async () => {
              if (totpVerifyCode.length === 6) {
                const totp = new OTPAuth.TOTP({
                  issuer: "ReBlocks",
                  label: userProfile?.email || "User",
                  algorithm: "SHA1",
                  digits: 6,
                  period: 30,
                  secret: OTPAuth.Secret.fromBase32(totpSecret),
                });
                
                const delta = totp.validate({ token: totpVerifyCode, window: 1 });
                if (delta !== null) {
                  await updateUserProfile({ twoFactorEnabled: true, totpSecret });
                  setTwoFactor(true);
                  setShowTwoFactorSetup(false);
                  Alert.alert("Success", "Two-Factor Authentication is now enabled.");
                } else {
                  setTotpError("Invalid verification code.");
                }
              } else {
                setTotpError("Please enter a 6-digit code.");
              }
            }}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveBtnText}>Verify & Enable</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showEmail}
        onClose={() => setShowEmail(false)}
        title="Email Address"
      >
        <View style={styles.modalForm}>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.modalValueBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.modalValueText, { color: theme.text }]}>{email}</Text>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showPhone}
        onClose={() => setShowPhone(false)}
        title="Phone Number"
      >
        <View style={styles.modalForm}>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>PHONE NUMBER</Text>
            <View style={[styles.modalValueBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.modalValueText, { color: theme.text }]}>{phone}</Text>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showPin}
        onClose={() => {
          setShowPin(false);
          setCurrentPin("");
          setNewPin("");
          setConfirmPin("");
          setPinError("");
          setPinSuccess(false);
        }}
        title={hasPin ? "Change Security PIN" : "Setup Security PIN"}
      >
        <View style={styles.modalForm}>
          {pinSuccess ? (
            <View style={{ paddingVertical: 20 }}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <CheckCircle size={40} color="#10B981" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 15, fontWeight: "800", color: theme.text }}>
                  {hasPin ? "PIN Changed Successfully!" : "PIN Setup Successfully!"}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, textAlign: "center" }}>
                  Your security PIN is updated and active.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalSaveBtnWrapper}
                onPress={() => {
                  setShowPin(false);
                  setCurrentPin("");
                  setNewPin("");
                  setConfirmPin("");
                  setPinSuccess(false);
                }}
              >
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
                  <Text style={styles.modalSaveBtnText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {hasPin && (
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>CURRENT PIN</Text>
                  <TextInput
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    placeholder="••••"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              )}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>NEW PIN</Text>
                <TextInput
                  value={newPin}
                  onChangeText={setNewPin}
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="••••"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>CONFIRM NEW PIN</Text>
                <TextInput
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="••••"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
              {pinError !== "" && (
                <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "600", marginBottom: 10 }}>{pinError}</Text>
              )}
              <TouchableOpacity
                style={styles.modalSaveBtnWrapper}
                onPress={async () => {
                  if (hasPin && currentPin.length < 4) {
                    setPinError("Current PIN must be exactly 4 digits.");
                    return;
                  }
                  if (newPin.length < 4 || confirmPin.length < 4) {
                    setPinError("New PIN must be exactly 4 digits.");
                    return;
                  }
                  if (newPin !== confirmPin) {
                    setPinError("New PINs do not match.");
                    return;
                  }
                  
                  try {
                    await AsyncStorage.setItem("user_pin", newPin);
                    await updateUserProfile({
                      pin: true,
                      userPin: parseInt(newPin),
                      pinsetup: new Date().toISOString()
                    });
                    setPinError("");
                    setPinSuccess(true);
                  } catch (e: any) {
                    setPinError(e.message || "Failed to save PIN.");
                  }
                }}
              >
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
                  <Text style={styles.modalSaveBtnText}>{hasPin ? "Update PIN" : "Save PIN"}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {hasPin && (
                <TouchableOpacity
                  style={styles.modalRemoveBtnWrapper}
                  onPress={() => {
                    setShowPinRemovalEntry(true);
                    onPinRemovalShow?.(true);
                    setShowPin(false);
                    setCurrentPin("");
                    setPinError("");
                  }}
                >
                  <Text style={styles.modalRemoveBtnText}>Remove PIN</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </BottomSheet>

      {/* Password Verification Modal */}
      <BottomSheet
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordInput("");
          setPasswordError("");
          setPendingAction(null);
        }}
        title="Verify Password"
      >
        <View style={styles.modalForm}>
          <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
            Enter your password to continue with this security action.
          </Text>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>PASSWORD</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry={!showPassword}
                style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, flex: 1, paddingRight: 40 }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.textSecondary}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeToggle}>
                <Eye size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {passwordError !== "" && (
              <Text style={styles.modalError}>{passwordError}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.modalSaveBtnWrapper}
            onPress={async () => {
              if (!passwordInput) {
                setPasswordError("Please enter your password");
                return;
              }
              
              try {
                // Re-authenticate user with actual password verification
                const user = auth.currentUser;
                if (!user || !user.email) {
                  setPasswordError("Authentication error");
                  return;
                }
                
                // Create credential with email and password
                const credential = EmailAuthProvider.credential(user.email, passwordInput);
                
                // Re-authenticate the user
                await reauthenticateWithCredential(user, credential);
                
                // Password verified successfully, proceed with action
                setShowPasswordModal(false);
                setPasswordInput("");
                setPasswordError("");
                
                // Execute pending action
                if (pendingAction === "pin") {
                  setCurrentPin("");
                  setNewPin("");
                  setConfirmPin("");
                  setPinError("");
                  setPinSuccess(false);
                  setShowPin(true);
                } else if (pendingAction === "2fa") {
                  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                  let randomBase32 = '';
                  for (let i = 0; i < 32; i++) {
                    randomBase32 += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  const secret = OTPAuth.Secret.fromBase32(randomBase32);
                  
                  const uri = new OTPAuth.TOTP({
                    issuer: "ReBlocks",
                    label: userProfile?.email || "User",
                    algorithm: "SHA1",
                    digits: 6,
                    period: 30,
                    secret: secret,
                  }).toString();
                  setTotpSecret(secret.base32);
                  setTotpUri(uri);
                  setTotpVerifyCode("");
                  setTotpError("");
                  setShowTwoFactorSetup(true);
                } else if (pendingAction === "biometric") {
                  setBiometric(true);
                  await updateUserProfile({ biometricEnabled: true });
                }
                
                setPendingAction(null);
              } catch (error: any) {
                console.error("Password verification error:", error);
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                  setPasswordError("Incorrect password");
                } else if (error.code === 'auth/too-many-requests') {
                  setPasswordError("Too many attempts. Please try again later.");
                } else {
                  setPasswordError("Authentication failed. Please try again.");
                }
              }
            }}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveBtnText}>Verify</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showCurrencySelector}
        onClose={() => setShowCurrencySelector(false)}
        title="Select Default Currency"
      >
        <View style={{ gap: 12, paddingBottom: 20 }}>
          {[
            { code: "USD", name: "USD — United States Dollar", flag: "🇺🇸" },
            { code: "PHP", name: "PHP — Philippine Peso", flag: "🇵🇭" },
          ].map((c) => {
            const isSelected = defaultCurrency === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                activeOpacity={0.8}
                onPress={() => {
                  setDefaultCurrency(c.code as any);
                  setShowCurrencySelector(false);
                  Alert.alert("Success", `Default currency set to ${c.code}!`);
                }}
                style={[
                  styles.currencySelectRow,
                  { backgroundColor: theme.background, borderColor: theme.border },
                  isSelected && { borderColor: "#10B981", backgroundColor: "rgba(16, 185, 129, 0.04)" }
                ]}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{c.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{c.name}</Text>
                </View>
                {isSelected && <CheckCircle size={18} color="#10B981" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showHelpSupport}
        onClose={() => setShowHelpSupport(false)}
        title="Help & Support"
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14, paddingBottom: 20 }}>
            {[
              { q: "How fast are Reblocks transfers?", a: "Reblocks utilizes high-speed Web3 networks (Morph L2) to execute payments. Almost all international transfers settle in your recipient's bank account or mobile wallet instantly!" },
              { q: "What are the transfer fees?", a: "We believe in clear and cheap remittance. Sending money to any supported Southeast Asian country has no transfer fee and zero hidden markup on the exchange rates." },
              { q: "Which funding sources are supported?", a: "You can securely connect any standard bank account (like BPI, DBS) or standard Visa/Mastercard debit and credit cards for instant deposits." },
              { q: "Is KYC verification mandatory?", a: "Yes, to ensure complete compliance with local financial regulations and prevent identity theft, we require a simple one-time identity verification." }
            ].map((faq, i) => (
              <View key={i} style={[styles.faqItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Q: {faq.q}</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{faq.a}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        title="KYC Identity Verification"
      >
        <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingBottom: 24, gap: 16 }}>
            {isVerified ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <CheckCircle size={48} color="#10B981" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Identity Fully Verified</Text>
                <Text style={{ color: "#374151", fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 20 }}>
                  Thank you! Your identity has been successfully verified.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <Text style={{ color: "#374151", fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 20 }}>
                  Verify your identity in seconds using our <Text style={{ fontWeight: "700", color: "#10B981" }}>secure KYC Provider</Text>.
                </Text>

                <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: "#10B981", borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ fontWeight: "700", fontSize: 12, color: theme.text, marginBottom: 4 }}>How It Works</Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 16 }}>
                    1. Secure KYC: Fully decentralized and end-to-end encrypted identity protocol.{"\n"}
                    2. Biometric Scan: Quick face verification matched against your ID.{"\n"}
                    3. Ultimate Privacy: You own your identity credentials. Revoke permission at any time.
                  </Text>
                </View>

                <Text style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 24, paddingHorizontal: 10 }}>
                  Tap below to start your secure KYC identity verification. You will be redirected to the verification portal.
                </Text>

                <TouchableOpacity
                  style={{ width: "100%", height: 48, borderRadius: 12, overflow: "hidden" }}
                  onPress={async () => {
                    const uid = userProfile?.uid || auth.currentUser?.uid;
                    if (!uid) {
                      Alert.alert("Error", "User ID not found. Please log in again.");
                      return;
                    }
                    setKycLoading(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    
                    try {
                      const API_URL = 'https://reblocks.onrender.com';
                      const redirectUrl = Linking.createURL('kyc-complete');

                      const response = await fetch(`${API_URL}/api/didit/create-session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid, callback: redirectUrl })
                      });
                      
                      if (!response.ok) {
                        throw new Error(`Server returned status ${response.status}`);
                      }

                      const contentType = response.headers.get("content-type");
                      if (!contentType || !contentType.includes("application/json")) {
                        throw new Error("Invalid response from server. Make sure the backend has the /api/didit/create-session endpoint deployed.");
                      }

                      const result = await response.json();
                      
                      if (result.success && result.data && result.data.url) {
                        setKycLoading(false); // Stop loading before opening browser
                        // Use openAuthSessionAsync to safely intercept the redirect URL and auto-close
                        const authResult = await WebBrowser.openAuthSessionAsync(result.data.url, redirectUrl);
                        if (authResult.type === 'success') {
                          await updateUserProfile({ KYCVerified: true });
                          Alert.alert("Verification Success", "Your identity has been verified successfully!");
                        }
                        setShowKycModal(false); // Close modal only after browser returns
                      } else {
                        throw new Error(result.error || "Failed to create verification session");
                      }
                    } catch (error: any) {
                      setKycLoading(false);
                      Alert.alert("Verification Error", error.message || "Could not connect to verification provider.");
                    }
                  }}
                >
                  <LinearGradient colors={["#10B981", "#059669"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    {kycLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>Start Verification</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </BottomSheet>

      {showPinRemovalEntry && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
          <PinEntryScreen
            forRemoval={true}
            onUnlock={async () => {
              try {
                await AsyncStorage.removeItem("user_pin");
                await updateUserProfile({
                  pin: false,
                  userPin: null,
                  pinsetup: null
                });
                setShowPinRemovalEntry(false);
                onPinRemovalShow?.(false);
                setShowPin(false);
                setCurrentPin("");
                setNewPin("");
                setConfirmPin("");
                Alert.alert("Success", "Your PIN has been removed successfully!");
              } catch (e: any) {
                Alert.alert("Error", e.message || "Failed to remove PIN.");
              }
            }}
            onLogout={() => {
              setShowPinRemovalEntry(false);
              onPinRemovalShow?.(false);
              setShowPin(true);
              setCurrentPin("");
            }}
          />
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 190,
  },
  header: {
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#9aa3b5",
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2d3748",
    marginTop: 2,
  },
  flatCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 20,
    marginBottom: 20,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  cameraBtnWrapper: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
  },
  cameraBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2d3748",
  },
  profileEmail: {
    fontSize: 11,
    color: "#9aa3b5",
    fontWeight: "600",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#f0fff4",
  },
  verifiedText: {
    color: "#48bb78",
    fontSize: 8,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(163, 177, 198, 0.1)",
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2d3748",
  },
  statLabel: {
    fontSize: 9,
    color: "#9aa3b5",
    fontWeight: "700",
    marginTop: 2,
  },
  kycBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 12,
  },
  kycIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  kycTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  kycSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    marginTop: 2,
  },
  kycBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  kycBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9aa3b5",
    letterSpacing: 0.8,
    marginLeft: 4,
    marginBottom: 10,
  },
  addMethodBtnWrapper: {
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  addMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addMethodBtnText: {
    color: "white",
    fontSize: 9,
    fontWeight: "800",
  },
  flatCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  methodIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  methodName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2d3748",
  },
  methodSub: {
    fontSize: 11,
    color: "#9aa3b5",
    marginTop: 2,
  },
  activeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#f0fff4",
  },
  activeStatusText: {
    color: "#48bb78",
    fontSize: 8,
    fontWeight: "800",
  },
  connectWalletBtnWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
  },
  connectWalletBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  flatCardGroup: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    paddingVertical: 8,
  },
  settingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingItemIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingItemLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2d3748",
  },
  settingItemSub: {
    fontSize: 11,
    color: "#b0b8c8",
    marginTop: 2,
  },
  smsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#f0fff4",
    marginRight: 4,
  },
  smsBadgeText: {
    color: "#48bb78",
    fontSize: 9,
    fontWeight: "800",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(163, 177, 198, 0.08)",
    marginHorizontal: 16,
  },
  signOutBtn: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutBtnText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "800",
  },
  versionText: {
    textAlign: "center",
    fontSize: 10,
    color: "#cbd5e1",
    fontWeight: "600",
  },

  
  modalForm: {
    gap: 16,
    paddingBottom: 20,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9aa3b5",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  modalDescription: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: "#2d3748",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalError: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 4,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  eyeToggle: {
    position: "absolute",
    right: 12,
    padding: 8,
  },
  modalValueBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalValueText: {
    fontSize: 13,
    color: "#2d3748",
    fontWeight: "600",
  },
  modalSaveBtnWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSaveBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  currencySelectRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  faqItem: {
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  faqQuestion: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2d3748",
  },
  faqAnswer: {
    fontSize: 11,
    color: "#718096",
    lineHeight: 16,
    fontWeight: "500",
  },
  modalRemoveBtnWrapper: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalRemoveBtnText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 12,
  },
  modalCancelBtnWrapper: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalCancelBtnText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 12,
  },
  modalBackBtnWrapper: {
    marginTop: 8,
  },
  modalBackBtnText: {
    textAlign: "center",
    color: "#9aa3b5",
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 12,
  },
  topRefreshContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  providerChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  providerChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primarySaveBtn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primarySaveBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  primarySaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cardPreview: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPreviewGradient: {
    padding: 20,
    minHeight: 170,
    justifyContent: 'space-between',
  },
  cardPreviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPreviewNetwork: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardPreviewNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginVertical: 16,
    fontVariant: ['tabular-nums'] as any,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewMicroLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardPreviewValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
