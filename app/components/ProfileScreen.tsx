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
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context";
import { AnimatedButton } from "./AnimatedButton";
import { BottomSheet } from "./BottomSheet";
import { PinEntryScreen } from "./PinEntryScreen";
import * as Haptics from "expo-haptics";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

interface ProfileScreenProps {
  onLogout?: () => void;
  onPinRemovalShow?: (show: boolean) => void;
}

export function ProfileScreen({ onLogout, onPinRemovalShow }: ProfileScreenProps) {
  const { fundingSources, defaultCurrency, setDefaultCurrency, userProfile, updateUserProfile } = useApp();
  const [biometric, setBiometric] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // States for Didit modal
  const [showDiditModal, setShowDiditModal] = useState(false);
  const [diditLoading, setDiditLoading] = useState(false);
  const [showPinRemovalEntry, setShowPinRemovalEntry] = useState(false);

  // Profile data values loaded from userProfile
  const name = userProfile?.fullName || "Carlos Mendoza";
  const address = userProfile?.address || "123 Metro Manila, Philippines";
  const birthday = userProfile?.birthday || "1995-10-12";
  const phone = userProfile?.phone || "+63 912 345 6789";
  const email = userProfile?.email || "carlos.mendoza@email.com";
  const isVerified = userProfile?.isVerified || false;
  const kycStatus = userProfile?.kycStatus || "pending";
  
  const hasPin = userProfile?.pin || false;
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
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

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
            setTempPhone(phone);
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
            setCurrentPin("");
            setNewPin("");
            setConfirmPin("");
            setPinError("");
            setPinSuccess(false);
            setShowPin(true);
          },
        },
        {
          icon: Shield,
          label: "Two-Factor Auth",
          sublabel: "Verification via SMS",
          color: "#10B981",
          toggle: true,
          toggleVal: twoFactor,
          onToggle: (val: boolean) => {
            setTwoFactor(val);
            Alert.alert("Two-Factor Auth", `SMS Two-Factor Authentication has been turned ${val ? "ON" : "OFF"}.`);
          },
        },
        {
          icon: Eye,
          label: "Biometric Login",
          sublabel: "Face ID / Fingerprint",
          color: "#10B981",
          toggle: true,
          toggleVal: biometric,
          onToggle: (val: boolean) => {
            setBiometric(val);
            Alert.alert("Biometrics", `Biometric Face ID / Fingerprint login has been turned ${val ? "ON" : "OFF"}.`);
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
          onToggle: (val: boolean) => {
            setNotifications(val);
            Alert.alert("Notifications", `App notifications have been ${val ? "enabled" : "disabled"}.`);
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
            Alert.alert("Dark Mode", `Dark Mode has been ${val ? "enabled" : "disabled"}. Premium theme presets will persist locally.`);
          },
        },
        {
          icon: MapPin,
          label: "Default Currency",
          sublabel: defaultCurrency === "USD" ? "USD — US Dollar" : "PHP — Philippine Peso",
          color: "#10B981",
          onPress: () => setShowCurrencySelector(true),
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
    <View style={styles.mainContainer}>
      {refreshing && (
        <View style={styles.topRefreshContainer}>
          <ActivityIndicator size="small" color="#10B981" />
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
          <Text style={styles.headerSubtitle}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        
        <View style={styles.flatCard}>
          <View style={styles.profileHeaderRow}>
            
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
            </View>

            
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.verifiedBadge, !isVerified && { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                  <CheckCircle size={10} color={isVerified ? "#48bb78" : "#ef4444"} style={{ marginRight: 3 }} />
                  <Text style={[styles.verifiedText, !isVerified && { color: "#ef4444" }]}>
                    {isVerified ? "VERIFIED" : "UNVERIFIED"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          
          <View style={styles.cardDivider} />

          
          <View style={styles.statsGrid}>
            {[
              { label: "Transfers", value: "47" },
              { label: "Countries", value: "5" },
              { label: "Member Since", value: "2023" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.statCol}>
                <Text style={styles.statVal}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDiditModal(true);
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
              <Text style={styles.kycTitle}>DIDIT Identity Verification</Text>
              <Text style={styles.kycSub}>
                {isVerified 
                  ? "Identity fully verified · Unlimited transfers" 
                  : "Tap to verify your ID using Didit KYC Protocol"}
              </Text>
            </View>
            <View style={styles.kycBadge}>
              <Text style={styles.kycBadgeText}>
                {isVerified ? "✓ Verified" : "⚠️ Start"}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        
        <View style={{ marginBottom: 20 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PAYMENT METHODS</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.addMethodBtnWrapper}
              onPress={() => Alert.alert("Add Payment Method", "Connecting a new credit card or bank account coming soon!")}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.addMethodBtn}
              >
                <Plus size={12} color="#ffffff" style={{ marginRight: 3 }} />
                <Text style={styles.addMethodBtnText}>Add</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {fundingSources.map((source) => (
              <View key={source.id} style={styles.flatCardRow}>
                <View style={styles.methodIconWrapper}>
                  {source.type === "bank" ? (
                    <Building2 size={16} color="#10B981" />
                  ) : (
                    <CreditCard size={16} color="#10B981" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>{source.name}</Text>
                  <Text style={styles.methodSub}>
                    {source.provider} · •••• {source.last4}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={styles.activeStatusBadge}>
                    <Text style={styles.activeStatusText}>ACTIVE</Text>
                  </View>
                  <ChevronRight size={16} color="#b0b8c8" />
                </View>
              </View>
            ))}

            
            <View style={styles.flatCardRow}>
              <View style={styles.methodIconWrapper}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20.5 11.3L12.9 3.7C12.4 3.2 11.6 3.2 11.1 3.7L3.5 11.3C3.2 11.6 3 12 3 12.4V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V12.4C21 12 20.8 11.6 20.5 11.3Z"
                    fill="#10B981"
                  />
                  <Path d="M12 15L8 11L12 7L16 11L12 15Z" fill="white" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>Connect Web3 Wallet</Text>
                <Text style={styles.methodSub}>Morph Network</Text>
              </View>
              <AnimatedButton
                style={styles.connectWalletBtnWrapper}
                onPress={() => Alert.alert("Web3 Wallet", "Connecting to a Web3 wallet (like Metamask or Rainbow Wallet) coming soon!")}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.connectWalletBtn}
                >
                  <Plus size={14} color="#ffffff" />
                </LinearGradient>
              </AnimatedButton>
            </View>
          </View>
        </View>

        
        {settingSections.map((section) => (
          <View key={section.title} style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.flatCardGroup}>
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
                          <Text style={styles.settingItemLabel}>{item.label}</Text>
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
                          <View style={styles.smsBadge}>
                            <Text style={styles.smsBadgeText}>{item.badge}</Text>
                          </View>
                        ) : (
                          <ChevronRight size={16} color="#b0b8c8" />
                        )}
                      </View>
                    </TouchableOpacity>
                    {!isLast && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        
        <AnimatedButton
          style={styles.signOutBtn}
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

      
      <BottomSheet
        isOpen={showPersonalInfo}
        onClose={() => setShowPersonalInfo(false)}
        title="Personal Information"
      >
        <View style={styles.modalForm}>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>FULL NAME</Text>
            <View style={styles.modalValueBox}>
              <Text style={styles.modalValueText}>{tempName}</Text>
            </View>
          </View>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>DATE OF BIRTH</Text>
            <View style={styles.modalValueBox}>
              <Text style={styles.modalValueText}>
                {tempBirthdayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
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
            <View style={styles.modalValueBox}>
              <Text style={styles.modalValueText}>{email}</Text>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showPhone}
        onClose={() => setShowPhone(false)}
        title="Update Phone Number"
      >

          <View style={styles.modalForm}>
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>NEW PHONE NUMBER</Text>
              <TextInput
                value={tempPhone}
                onChangeText={setTempPhone}
                style={styles.modalInput}
                placeholder="+63 912 345 6789"
                placeholderTextColor="#9aa3b5"
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.modalSaveBtnWrapper}
              onPress={async () => {
                if (!tempPhone.trim()) {
                  Alert.alert("Error", "Phone number cannot be empty.");
                  return;
                }
                try {
                  await updateUserProfile({ phone: tempPhone });
                  setShowPhone(false);
                  Alert.alert("Success", "Phone number updated successfully!");
                } catch (e: any) {
                  Alert.alert("Update Failed", e.message || "Failed to update phone number.");
                }
              }}
            >
              <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveBtnText}>Update Phone</Text>
              </LinearGradient>
            </TouchableOpacity>
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
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#2d3748" }}>
                  {hasPin ? "PIN Changed Successfully!" : "PIN Setup Successfully!"}
                </Text>
                <Text style={{ fontSize: 11, color: "#9aa3b5", marginTop: 4, textAlign: "center" }}>
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
                    style={styles.modalInput}
                    placeholder="••••"
                    placeholderTextColor="#9aa3b5"
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
                  style={styles.modalInput}
                  placeholder="••••"
                  placeholderTextColor="#9aa3b5"
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
                  style={styles.modalInput}
                  placeholder="••••"
                  placeholderTextColor="#9aa3b5"
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
                  isSelected && { borderColor: "#10B981", backgroundColor: "rgba(16, 185, 129, 0.04)" }
                ]}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{c.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#2d3748" }}>{c.name}</Text>
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
              { q: "What are the transfer fees?", a: "We believe in clear and cheap remittance. Sending money to any supported Southeast Asian country costs a flat fee of just $0.30 (or ₱15.00) with zero hidden markup on the exchange rates." },
              { q: "Which funding sources are supported?", a: "You can securely connect any standard bank account (like BPI, DBS) or standard Visa/Mastercard debit and credit cards for instant deposits." },
              { q: "Is KYC verification mandatory?", a: "Yes, to ensure complete compliance with local financial regulations and prevent identity theft, we require a simple one-time identity verification." }
            ].map((faq, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>Q: {faq.q}</Text>
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        isOpen={showDiditModal}
        onClose={() => setShowDiditModal(false)}
        title="Didit ID Verification"
      >
        <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingBottom: 24, gap: 16 }}>
            {isVerified ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <CheckCircle size={48} color="#10B981" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>Identity Fully Verified</Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 4, textAlign: "center", lineHeight: 18 }}>
                  Thank you! Your identity has been successfully verified via Didit's decentralized compliance network.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 13, color: "#475569", lineHeight: 20 }}>
                  Verify your identity in seconds using <Text style={{ fontWeight: "700", color: "#10B981" }}>Didit decentralized KYC Protocol</Text>.
                </Text>

                <View style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: "#10B981" }}>
                  <Text style={{ fontWeight: "700", fontSize: 12, color: "#1e293b", marginBottom: 4 }}>How It Works</Text>
                  <Text style={{ fontSize: 11, color: "#475569", lineHeight: 16 }}>
                    1. Secure KYC: Fully decentralized and end-to-end encrypted identity protocol.{"\n"}
                    2. Biometric Scan: Quick face verification matched against your ID.{"\n"}
                    3. Ultimate Privacy: You own your identity credentials. Revoke permission at any time.
                  </Text>
                </View>

                <View style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: "#10B981" }}>
                  <Text style={{ fontWeight: "700", fontSize: 12, color: "#065f46", marginBottom: 4 }}>Requirements to make Didit live:</Text>
                  <Text style={{ fontSize: 11, color: "#065f46", lineHeight: 16 }}>
                    • Didit Developer Client ID & Client Secret credentials.{"\n"}
                    • Mobile SDK/WebView setup to present the identity capture screens.{"\n"}
                    • Backend webhook handler (e.g. Firebase Cloud Function) to receive verified status updates.
                  </Text>
                </View>

                <Text style={{ fontSize: 12, fontStyle: "italic", color: "#94a3b8", textAlign: "center" }}>
                  For now, we have simulated the Didit integration! You can tap below to instantly verify your profile.
                </Text>

                <TouchableOpacity
                  style={{ width: "100%", height: 48, borderRadius: 12, overflow: "hidden" }}
                  onPress={async () => {
                    setDiditLoading(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setTimeout(async () => {
                      try {
                        await updateUserProfile({ 
                          isVerified: true, 
                          KYCVerified: true, 
                          kycStatus: "verified" 
                        });
                        setDiditLoading(false);
                        setShowDiditModal(false);
                        Alert.alert("KYC Completed", "Your account has been fully verified successfully!");
                      } catch (error: any) {
                        setDiditLoading(false);
                        Alert.alert("Verification Error", error.message);
                      }
                    }, 2000);
                  }}
                >
                  <LinearGradient colors={["#10B981", "#059669"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    {diditLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>Simulate Didit KYC Scan</Text>
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
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    paddingVertical: 6,
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
    height: 48,
    borderRadius: 16,
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
});
