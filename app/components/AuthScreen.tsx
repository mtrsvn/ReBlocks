import React, { useState } from "react";
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
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { AnimatedButton } from "./AnimatedButton";

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

interface AuthScreenProps {
  onLoginSuccess: (userName: string) => void;
}

type AuthMode = "login" | "signup" | "forgot";

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [agreeKYC, setAgreeKYC] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedPhoneCode, setSelectedPhoneCode] = useState(PHONE_CODES[0]);
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);

  
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setRecoverySent(false);
    setFocusedInput(null);
    setShowCountryDropdown(false);
    setShowPhoneCodeDropdown(false);
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(fullName || "Carlos Mendoza");
    }, 1500);
  };

  const handleSignup = () => {
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "Account Created!",
        "Your ReBlocks L2 Web3 smart wallet has been created successfully. Welcome aboard!",
        [{ text: "Get Started", onPress: () => onLoginSuccess(fullName) }]
      );
    }, 2000);
  };

  const handleForgotPassword = () => {
    if (!forgotEmail) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRecoverySent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
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
                  placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
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
              <Text style={styles.subheadline}>Enter your details exactly as shown on your legal ID</Text>

              
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
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedInput("fullName")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
              </View>

              
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
                  placeholderTextColor="#94a3b8"
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
                    placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("pwd")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
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
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedInput("confirmPwd")}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.input}
                />
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
                      placeholderTextColor="#94a3b8"
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

        </ScrollView>
      </KeyboardAvoidingView>
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
    fontWeight: "700",
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
});
