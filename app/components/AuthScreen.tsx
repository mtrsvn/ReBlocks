import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Globe,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Shield,
  ArrowLeft,
  Calendar,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { AnimatedButton } from "./AnimatedButton";
import { DatePickerModal } from "./DatePickerModal";
import { useApp, useTheme } from "../context";
import { auth, db } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  updateProfile,
  signOut
} from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-3 0 262 262">
      <Path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/>
      <Path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/>
      <Path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/>
      <Path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/>
    </Svg>
  );
}

const COUNTRIES = [
  { name: "Philippines", code: "PH", flag: "🇵🇭" },
  { name: "Singapore", code: "SG", flag: "🇸🇬" },
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "Thailand", code: "TH", flag: "🇹🇭" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩" },
];

const PHONE_CODES = [
  { country: "Philippines", code: "+63", flag: "🇵🇭", placeholder: "912 345 6789" },
  { country: "Singapore", code: "+65", flag: "🇸🇬", placeholder: "8123 4567" },
  { country: "United States", code: "+1", flag: "🇺🇸", placeholder: "201 555 0123" },
  { country: "Thailand", code: "+66", flag: "🇹🇭", placeholder: "81 234 5678" },
  { country: "Vietnam", code: "+84", flag: "🇻🇳", placeholder: "91 234 5678" },
  { country: "Malaysia", code: "+60", flag: "🇲🇾", placeholder: "12 345 6789" },
  { country: "Indonesia", code: "+62", flag: "🇮🇩", placeholder: "812 3456 7890" },
];

function formatPhoneNumber(text: string, countryCode: string): string {
  const cleaned = text.replace(/\D/g, "");
  switch (countryCode) {
    case "+63":
    case "+1":
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    case "+65":
      if (cleaned.length <= 4) return cleaned;
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)}`;
    case "+66":
    case "+84":
    case "+60":
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)}`;
    case "+62":
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 7) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)}`;
    default:
      return cleaned;
  }
}

interface AuthScreenProps {}

type AuthMode = "login" | "signup" | "forgot" | "verifyEmail";

export function AuthScreen({}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Use theme from context, or default to light theme if outside AppProvider (though it is inside AppProvider)
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [agreeKYC, setAgreeKYC] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedPhoneCode, setSelectedPhoneCode] = useState(PHONE_CODES[0]);
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      if (auth.currentUser) {
        if (!auth.currentUser.emailVerified) {
          setMode("verifyEmail");
        }
      }
    };
    checkUser();
  }, []);

  const switchMode = (newMode: AuthMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setRecoverySent(false);
    setFocusedInput(null);
    setShowCountryDropdown(false);
    setShowPhoneCodeDropdown(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setMode("verifyEmail");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Verify your Email", "A verification link has been sent to your email. Please verify it to continue.");
      } else {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { emailVerified: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.log("Login error:", error);
      Alert.alert("Authentication Failed", error.message || "Invalid email or password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Missing Details", "Please fill in all details to create your account.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (!agreeKYC) {
      Alert.alert("Consent Required", "Please agree to the KYC compliance to proceed.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: fullName });

      await sendEmailVerification(user);

      // Format date as YYYY-MM-DD
      const dobFormatted = dateOfBirth.toISOString().split('T')[0];

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        email,
        phone: `${selectedPhoneCode?.code || "+63"} ${phone}`,
        country: selectedCountry?.name || "Philippines",
        birthday: dobFormatted,
        emailVerified: false,
        KYCVerified: false,
        isAdmin: false,
        kycStatus: 'pending',
        defaultCurrency: 'USD',
        createdAt: new Date().toISOString(),
        pin: false,
        userPin: null,
        pinsetup: null,
        pinAttempt: 0,
        isLocked: false,
        lockedUntil: null
      });

      // Clear signup form and show verification screen
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setDateOfBirth(new Date(2000, 0, 1));
      setAgreeKYC(false);
      
      setMode("verifyEmail");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Account Created!",
        "Your account was created successfully. A verification link has been sent to your email. Please verify it to continue.",
      );
    } catch (error: any) {
      console.log("Signup error:", error);
      Alert.alert("Registration Failed", error.message || "Failed to create account.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setRecoverySent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Reset Failed", error.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userDocRef, { emailVerified: true });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Email Verified!", "Welcome to ReBlocks! Your account is active now.");
        } else {
          Alert.alert("Not Verified Yet", "Please check your inbox and tap the link to verify your email. If you didn't receive it, you can tap Resend below.");
        }
      } catch (error: any) {
        Alert.alert("Error checking verification", error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        await sendEmailVerification(auth.currentUser);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Link Sent", "A fresh verification link has been sent to " + auth.currentUser.email);
      } catch (error: any) {
        Alert.alert("Error sending link", error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackToLogin = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      switchMode("login");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >


        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {mode === "login" && (
            <View style={styles.formContainer}>
              <Text style={styles.headline}>Welcome back</Text>
              <Text style={styles.subheadline}>Sign in to continue your secure transfers</Text>

              
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputBlock,
                  focusedInput === "email" && styles.inputBlockFocused,
                ]}
              >
                <Mail size={18} color={focusedInput === "email" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                <TextInput
                  placeholder="name@email.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
              </View>

              
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputBlock,
                  focusedInput === "password" && styles.inputBlockFocused,
                ]}
              >
                <Lock size={18} color={focusedInput === "password" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showLoginPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
                <AnimatedButton
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                  style={styles.eyeButton}
                >
                  {showLoginPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </AnimatedButton>
              </View>

              
              <TouchableOpacity onPress={() => switchMode("forgot")} style={styles.forgotContainer}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              
              <AnimatedButton disabled={loading} onPress={handleLogin} style={styles.btnWrapper}>
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.btn}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.btnText}>Sign In</Text>
                      <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </LinearGradient>
              </AnimatedButton>

              
              <View style={styles.orDividerContainer}>
                <View style={styles.orDividerLine} />
                <Text style={styles.orDividerText}>or</Text>
                <View style={styles.orDividerLine} />
              </View>

              
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert("Google Sign In", "Google authentication coming soon on the development phase!");
                }}
                style={styles.googleBtn}
              >
                <GoogleIcon size={18} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>New to ReBlocks? </Text>
                <TouchableOpacity onPress={() => switchMode("signup")}>
                  <Text style={styles.footerActionText}>Sign up now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          
          {mode === "signup" && (
            <View style={styles.formContainer}>
              <Text style={styles.headline}>Create account</Text>
              <Text style={styles.subheadline}>Create your ReBlocks account in a few simple steps</Text>

              
              <Text style={styles.inputLabel}>FULL LEGAL NAME</Text>
              <View
                style={[
                  styles.inputBlock,
                  focusedInput === "fullName" && styles.inputBlockFocused,
                ]}
              >
                <User size={18} color={focusedInput === "fullName" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor={theme.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedInput("fullName")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
              </View>

              
              <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDatePicker(true);
                }}
                style={[
                  styles.inputBlock,
                  { justifyContent: "space-between" },
                  focusedInput === "dob" && styles.inputBlockFocused,
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Calendar size={18} color={focusedInput === "dob" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                  <Text style={styles.dateValue}>
                    {dateOfBirth.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
                <ChevronDown size={14} color="#94a3b8" />
              </TouchableOpacity>

              
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputBlock,
                  focusedInput === "email" && styles.inputBlockFocused,
                ]}
              >
                <Mail size={18} color={focusedInput === "email" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                <TextInput
                  placeholder="name@email.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
              </View>

              
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <View style={{ zIndex: 10 }}>
                <View
                  style={[
                    styles.inputBlock,
                    (focusedInput === "phone" || focusedInput === "phoneCode") && styles.inputBlockFocused,
                    { paddingHorizontal: 8 },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowPhoneCodeDropdown(!showPhoneCodeDropdown);
                      setShowCountryDropdown(false);
                      setFocusedInput(showPhoneCodeDropdown ? null : "phoneCode");
                    }}
                    style={styles.phoneCodeSelector}
                  >
                    <Text style={styles.phoneCodeFlag}>{selectedPhoneCode.flag}</Text>
                    <Text style={styles.phoneCodeText}>{selectedPhoneCode.code}</Text>
                    <ChevronDown size={10} color="#94a3b8" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>

                  <View style={styles.phoneDivider} />

                  <TextInput
                    placeholder={selectedPhoneCode.placeholder}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(txt) => setPhone(formatPhoneNumber(txt, selectedPhoneCode.code))}
                    onFocus={() => {
                      setFocusedInput("phone");
                      setShowPhoneCodeDropdown(false);
                    }}
                    onBlur={() => setFocusedInput(null)}
                    style={[styles.input, { paddingLeft: 8 }]}
                  />
                </View>

                {showPhoneCodeDropdown && (
                  <View style={styles.phoneDropdown}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {PHONE_CODES.map((c) => (
                        <TouchableOpacity
                          key={c.code}
                          onPress={() => {
                            setSelectedPhoneCode(c);
                            setShowPhoneCodeDropdown(false);
                            setFocusedInput(null);
                            setPhone("");
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={styles.dropdownRow}
                        >
                          <Text style={styles.dropdownFlag}>{c.flag}</Text>
                          <Text style={styles.phoneDropdownCode}>{c.code}</Text>
                          <Text style={styles.phoneDropdownCountry}>{c.country}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              
              <Text style={styles.inputLabel}>COUNTRY OF RESIDENCE</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCountryDropdown(!showCountryDropdown);
                  setFocusedInput(showCountryDropdown ? null : "country");
                }}
                style={[
                  styles.inputBlock,
                  { justifyContent: "space-between" },
                  focusedInput === "country" && styles.inputBlockFocused,
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Globe size={18} color={focusedInput === "country" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                  <Text style={styles.countryValue}>
                    {selectedCountry.flag}  {selectedCountry.name}
                  </Text>
                </View>
                <ChevronDown size={14} color="#94a3b8" />
              </TouchableOpacity>

              
              {showCountryDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                    {COUNTRIES.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        onPress={() => {
                          setSelectedCountry(c);
                          setShowCountryDropdown(false);
                          setFocusedInput(null);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.dropdownRow}
                      >
                        <Text style={styles.dropdownFlag}>{c.flag}</Text>
                        <Text style={styles.dropdownText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              
              <Text style={styles.inputLabel}>CREATE PASSWORD</Text>
              <View
                style={[
                  styles.inputBlock,
                  focusedInput === "pwd" && styles.inputBlockFocused,
                ]}
              >
                <Lock size={18} color={focusedInput === "pwd" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                <TextInput
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showSignupPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("pwd")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
                <AnimatedButton
                  onPress={() => setShowSignupPassword(!showSignupPassword)}
                  style={styles.eyeButton}
                >
                  {showSignupPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </AnimatedButton>
              </View>

              
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View
                style={[
                  styles.inputBlock,
                  focusedInput === "confirmPwd" && styles.inputBlockFocused,
                ]}
              >
                <Lock size={18} color={focusedInput === "confirmPwd" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                <TextInput
                  placeholder="Repeat password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedInput("confirmPwd")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
                <AnimatedButton
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  {showConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </AnimatedButton>
              </View>

              
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAgreeKYC(!agreeKYC);
                }}
                style={styles.checkboxWrapper}
              >
                <View style={[styles.checkbox, agreeKYC && styles.checkboxChecked]}>
                  {agreeKYC && <Check size={11} color="#ffffff" strokeWidth={3.5} />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I have read and agree to the{" "}
                  <Text style={styles.linkText} onPress={() => Alert.alert("Privacy Policy", "Showing Privacy Policy...")}>
                    Privacy Policy
                  </Text>
                  {" "}and{" "}
                  <Text style={styles.linkText} onPress={() => Alert.alert("Terms & Conditions", "Showing Terms & Conditions...")}>
                    Terms & Conditions
                  </Text>
                </Text>
              </TouchableOpacity>

              
              <AnimatedButton disabled={loading} onPress={handleSignup} style={styles.btnWrapper}>
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.btn}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.btnText}>Agree and Continue</Text>
                      <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </LinearGradient>
              </AnimatedButton>

              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Already have an account? </Text>
                <TouchableOpacity onPress={() => switchMode("login")}>
                  <Text style={styles.footerActionText}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          
          {mode === "forgot" && (
            <View style={styles.formContainer}>
              {recoverySent ? (
                <View style={styles.successWrapper}>
                  <View style={styles.successBadge}>
                    <CheckCircle size={36} color="#10B981" />
                  </View>
                  <Text style={styles.headline}>Link Sent</Text>
                  <Text style={styles.successMessage}>
                    We have dispatched password recovery guidelines directly to:{"\n"}
                    <Text style={{ fontWeight: "700", color: "#0f172a" }}>{forgotEmail}</Text>
                  </Text>

                  <AnimatedButton onPress={() => switchMode("login")} style={[styles.btnWrapper, { marginTop: 20 }]}>
                    <LinearGradient colors={["#10B981", "#059669"]} style={styles.btn}>
                      <Text style={styles.btnText}>Return to Sign In</Text>
                    </LinearGradient>
                  </AnimatedButton>
                </View>
              ) : (
                <View>
                  <Text style={styles.headline}>Reset password</Text>
                  <Text style={styles.subheadline}>Enter the email associated with your ReBlocks wallet</Text>

                  
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <View
                    style={[
                      styles.inputBlock,
                      focusedInput === "forgotEmail" && styles.inputBlockFocused,
                    ]}
                  >
                    <Mail size={18} color={focusedInput === "forgotEmail" ? "#10B981" : "#94a3b8"} style={styles.inputIcon} />
                    <TextInput
                      placeholder="name@email.com"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      onFocus={() => setFocusedInput("forgotEmail")}
                      onBlur={() => setFocusedInput(null)}
                      style={styles.input}
                    />
                  </View>

                  
                  <AnimatedButton disabled={loading} onPress={handleForgotPassword} style={styles.btnWrapper}>
                    <LinearGradient colors={["#10B981", "#059669"]} style={styles.btn}>
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.btnText}>Send Recovery Link</Text>
                      )}
                    </LinearGradient>
                  </AnimatedButton>

                  
                  <View style={styles.footerRow}>
                    <Text style={styles.footerLabel}>Remember password? </Text>
                    <TouchableOpacity onPress={() => switchMode("login")}>
                      <Text style={styles.footerActionText}>Login</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {mode === "verifyEmail" && (
            <View style={[styles.formContainer, { justifyContent: "center", alignItems: "center", width: "100%" }]}>
              <View style={[styles.successWrapper, { width: "100%", alignItems: "center" }]}>
                <View style={styles.successBadge}>
                  <Mail size={36} color="#10B981" />
                </View>
                <Text style={[styles.headline, { textAlign: "center" }]}>Verify Your Email</Text>
                <Text style={[styles.successMessage, { textAlign: "center", width: "100%" }]}>
                  We've sent a verification link to your email address:{"\n"}
                  <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                    {auth.currentUser?.email || email}
                  </Text>{"\n\n"}
                  Please open the link in your email inbox to verify your account, then click the button below.
                </Text>

                <AnimatedButton disabled={loading} onPress={checkVerification} style={[styles.btnWrapper, { marginTop: 24, width: "100%" }]}>
                  <LinearGradient colors={["#10B981", "#059669"]} style={styles.btn}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.btnText}>I Have Verified My Email</Text>
                    )}
                  </LinearGradient>
                </AnimatedButton>

                <TouchableOpacity 
                  disabled={loading} 
                  onPress={resendVerification} 
                  style={{ marginTop: 12, paddingVertical: 10, width: "100%", alignItems: "center" }}
                >
                  <Text style={{ color: "#10B981", fontWeight: "700", fontSize: 13, textAlign: "center" }}>
                    Resend Verification Link
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  disabled={loading} 
                  onPress={handleBackToLogin} 
                  style={{ marginTop: 6, paddingVertical: 10, width: "100%", alignItems: "center" }}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 13, textAlign: "center" }}>
                    Back to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        date={dateOfBirth}
        onConfirm={(date) => {
          setDateOfBirth(date);
          setShowDatePicker(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onCancel={() => setShowDatePicker(false)}
        title="Select Date of Birth"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  navBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.6,
  },
  subheadline: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 28,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 18,
  },
  inputBlockFocused: {
    borderColor: "#10B981",
    borderWidth: 1.5,
    backgroundColor: "#ffffff",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  eyeButton: {
    padding: 6,
  },
  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  forgotText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "800",
  },
  btnWrapper: {
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 24,
  },
  btn: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  footerLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  footerActionText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "800",
  },
  
  countryValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  dropdown: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 6,
    marginBottom: 18,
    maxHeight: 180,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownFlag: {
    fontSize: 16,
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "700",
  },
  checkboxWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  linkText: {
    color: "#10B981",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  
  successWrapper: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  phoneCodeSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    height: "100%",
  },
  phoneCodeFlag: {
    fontSize: 18,
    marginRight: 4,
  },
  phoneCodeText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 6,
  },
  phoneDropdown: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 6,
    maxHeight: 180,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 99,
  },
  phoneDropdownCode: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "800",
    width: 48,
  },
  phoneDropdownCountry: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  orDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  orDividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "lowercase",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    height: 48,
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16,
  },
  googleBtnText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "700",
  },
  dateValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  datePickerDoneButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  datePickerDoneText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
});
