import React, { useState } from "react";
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
  Image,
} from "react-native";
import {
  ChevronRight,
  Shield,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  CheckCircle,
  Camera,
  Phone,
  Mail,
  MapPin,
  Lock,
  Eye,
  User,
  Plus,
  Building2,
  Moon,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context";
import { AnimatedButton } from "./AnimatedButton";
import { BottomSheet } from "./BottomSheet";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

interface ProfileScreenProps {
  onLogout?: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { fundingSources, defaultCurrency, setDefaultCurrency } = useApp();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need media library permissions to upload your profile photo.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        setProfileImage(result.assets[0].uri);
        setShowPhotoPicker(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Could not pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need camera permissions to take a photo.");
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        setProfileImage(result.assets[0].uri);
        setShowPhotoPicker(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Could not take photo. Please try again.");
    }
  };

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

  // Modal visibilities
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);

  // Account states
  const [name, setName] = useState("Carlos Mendoza");
  const [address, setAddress] = useState("123 Metro Manila, Philippines");
  const [birthday, setBirthday] = useState("1995-10-12");

  const [phone, setPhone] = useState("+63 912 345 6789");
  const [email, setEmail] = useState("carlos.mendoza@email.com");

  // PIN states
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);

  // Temporary edit states for modals
  const [tempName, setTempName] = useState("Carlos Mendoza");
  const [tempAddress, setTempAddress] = useState("123 Metro Manila, Philippines");
  const [tempBirthday, setTempBirthday] = useState("1995-10-12");
  const [tempPhone, setTempPhone] = useState("+63 912 345 6789");
  const [tempEmail, setTempEmail] = useState("carlos.mendoza@email.com");

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
            setTempAddress(address);
            setTempBirthday(birthday);
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
            setTempEmail(email);
            setShowEmail(true);
          },
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: Lock,
          label: "Change PIN",
          sublabel: "Last changed 30 days ago",
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.flatCard}>
          <View style={styles.profileHeaderRow}>
            {/* Avatar */}
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPhotoPicker(true);
                }}
                style={styles.avatarCircle}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
                )}
              </TouchableOpacity>
              <AnimatedButton
                style={styles.cameraBtnWrapper}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPhotoPicker(true);
                }}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.cameraBtn}
                >
                  <Camera size={10} color="#ffffff" />
                </LinearGradient>
              </AnimatedButton>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={10} color="#48bb78" style={{ marginRight: 3 }} />
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Stats Grid */}
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

        {/* KYC Section Banner */}
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.kycBanner}
        >
          <View style={styles.kycIconWrapper}>
            <Shield size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kycTitle}>KYC Verification</Text>
            <Text style={styles.kycSub}>Identity fully verified · Unlimited transfers</Text>
          </View>
          <View style={styles.kycBadge}>
            <Text style={styles.kycBadgeText}>✓ Done</Text>
          </View>
        </LinearGradient>

        {/* Payment Methods */}
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

            {/* Web3 Wallet */}
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

        {/* Settings Sections */}
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

        {/* Sign Out Button */}
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

        {/* App Version */}
        <Text style={styles.versionText}>v0.1.0-dev · ReBlocks Development Phase</Text>
      </ScrollView>

      {/* BottomSheets for Settings */}
      <BottomSheet
        isOpen={showPersonalInfo}
        onClose={() => setShowPersonalInfo(false)}
        title="Personal Information"
      >
        <View style={styles.modalForm}>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>FULL NAME</Text>
            <TextInput
              value={tempName}
              onChangeText={setTempName}
              style={styles.modalInput}
              placeholder="Full Name"
              placeholderTextColor="#9aa3b5"
            />
          </View>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>DELIVERY ADDRESS</Text>
            <TextInput
              value={tempAddress}
              onChangeText={setTempAddress}
              style={styles.modalInput}
              placeholder="Address"
              placeholderTextColor="#9aa3b5"
            />
          </View>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>DATE OF BIRTH (YYYY-MM-DD)</Text>
            <TextInput
              value={tempBirthday}
              onChangeText={setTempBirthday}
              style={styles.modalInput}
              placeholder="Birthday"
              placeholderTextColor="#9aa3b5"
            />
          </View>
          <TouchableOpacity
            style={styles.modalSaveBtnWrapper}
            onPress={() => {
              if (!tempName.trim()) {
                Alert.alert("Error", "Name cannot be empty.");
                return;
              }
              setName(tempName);
              setAddress(tempAddress);
              setBirthday(tempBirthday);
              setShowPersonalInfo(false);
              Alert.alert("Success", "Personal Information updated successfully!");
            }}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveBtnText}>Save Changes</Text>
            </LinearGradient>
          </TouchableOpacity>
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
            onPress={() => {
              if (!tempPhone.trim()) {
                Alert.alert("Error", "Phone number cannot be empty.");
                return;
              }
              setPhone(tempPhone);
              setShowPhone(false);
              Alert.alert("Success", "Phone number updated successfully!");
            }}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveBtnText}>Update Phone</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showEmail}
        onClose={() => setShowEmail(false)}
        title="Update Email Address"
      >
        <View style={styles.modalForm}>
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalLabel}>NEW EMAIL ADDRESS</Text>
            <TextInput
              value={tempEmail}
              onChangeText={setTempEmail}
              style={styles.modalInput}
              placeholder="carlos.mendoza@email.com"
              placeholderTextColor="#9aa3b5"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={styles.modalSaveBtnWrapper}
            onPress={() => {
              if (!tempEmail.trim() || !tempEmail.includes("@")) {
                Alert.alert("Error", "Please enter a valid email address.");
                return;
              }
              setEmail(tempEmail);
              setShowEmail(false);
              Alert.alert("Success", "Email address updated successfully!");
            }}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveBtnText}>Update Email</Text>
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
        title="Change Security PIN"
      >
        <View style={styles.modalForm}>
          {pinSuccess ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <CheckCircle size={40} color="#10B981" style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#2d3748" }}>PIN Changed Successfully!</Text>
              <Text style={{ fontSize: 11, color: "#9aa3b5", marginTop: 4, textAlign: "center" }}>Your security PIN is updated and active.</Text>
            </View>
          ) : (
            <>
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
                onPress={() => {
                  if (currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4) {
                    setPinError("PIN must be exactly 4 digits.");
                    return;
                  }
                  if (newPin !== confirmPin) {
                    setPinError("New PINs do not match.");
                    return;
                  }
                  setPinError("");
                  setPinSuccess(true);
                  setTimeout(() => {
                    setShowPin(false);
                    setCurrentPin("");
                    setNewPin("");
                    setConfirmPin("");
                    setPinSuccess(false);
                    Alert.alert("Success", "Security PIN changed successfully!");
                  }, 1500);
                }}
              >
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSaveBtn}>
                  <Text style={styles.modalSaveBtnText}>Save New PIN</Text>
                </LinearGradient>
              </TouchableOpacity>
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
        isOpen={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        title="Upload Profile Photo"
      >
        <View style={{ paddingBottom: 24, gap: 18 }}>
          {/* Action Row */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={takePhoto}
              style={{
                flex: 1,
                backgroundColor: "#f1f5f9",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: "#e2e8f0",
              }}
            >
              <Camera size={20} color="#10B981" />
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155", marginTop: 6 }}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={pickImage}
              style={{
                flex: 1,
                backgroundColor: "#f1f5f9",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: "#e2e8f0",
              }}
            >
              <Plus size={20} color="#10B981" />
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155", marginTop: 6 }}>Choose Library</Text>
            </TouchableOpacity>
          </View>

          {/* Remove Current Photo */}
          {profileImage && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setProfileImage(null);
                setShowPhotoPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 6,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#ef4444" }}>Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>
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
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#10B981",
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

  // Modal styles
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
