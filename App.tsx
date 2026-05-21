import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  View,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Bot } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppProvider, Recipient, useApp } from "./app/context";
import { getTheme } from "./app/colors";
import { BottomNav } from "./app/components/BottomNav";
import { HomeScreen } from "./app/components/HomeScreen";
import { SendMoneyFlow } from "./app/components/SendMoneyFlow";
import { BeneficiariesScreen } from "./app/components/BeneficiariesScreen";
import { TransactionHistory } from "./app/components/TransactionHistory";
import { ProfileScreen } from "./app/components/ProfileScreen";
import { AIChatScreen } from "./app/components/AIChatScreen";
import { AnimatedButton } from "./app/components/AnimatedButton";
import { AuthScreen } from "./app/components/AuthScreen";
import { PinEntryScreen } from "./app/components/PinEntryScreen";
import { TwoFactorVerifyScreen } from "./app/components/TwoFactorVerifyScreen";
import { auth } from "./app/firebase";
import { signOut } from "firebase/auth";

type Screen = "home" | "send" | "beneficiaries" | "history" | "profile" | "ai-chat";

const HIDE_NAV: Screen[] = ["send", "ai-chat"];
const HIDE_FAB: Screen[] = ["send", "ai-chat"];

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { userProfile, isAuthLoading, darkMode } = useApp();
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [preselectedRecipient, setPreselectedRecipient] = useState<Recipient | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [twoFactorUnlocked, setTwoFactorUnlocked] = useState(false);
  const [showPinRemovalEntry, setShowPinRemovalEntry] = useState(false);
  const theme = getTheme(darkMode);



  React.useEffect(() => {
    if (!userProfile) {
      setPinUnlocked(false);
      setTwoFactorUnlocked(false);
    } else {
      if (!userProfile.pin) {
        setPinUnlocked(true);
      }
      if (!userProfile.twoFactorEnabled) {
        setTwoFactorUnlocked(true);
      }
    }
  }, [userProfile]);

  const navigate = (screen: Screen, recipient: Recipient | null = null) => {
    setPreselectedRecipient(recipient);
    setActiveScreen(screen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("home");
    } catch (e) {
      console.log("Error signing out:", e);
    }
  };

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!userProfile || !userProfile.emailVerified) {
    return (
      <View style={[styles.appContainer, { backgroundColor: theme.background }]}>
        <StatusBar style={darkMode ? "light" : "dark"} />
        <AuthScreen />
      </View>
    );
  }

  if (userProfile.twoFactorEnabled && !twoFactorUnlocked) {
    return (
      <View style={[styles.appContainer, { backgroundColor: theme.background }]}>
        <StatusBar style={darkMode ? "light" : "dark"} />
        <TwoFactorVerifyScreen 
          onUnlock={() => setTwoFactorUnlocked(true)} 
          onLogout={handleLogout} 
        />
      </View>
    );
  }

  if ((userProfile.pin || userProfile.biometricEnabled) && !pinUnlocked) {
    return (
      <View style={[styles.appContainer, { backgroundColor: theme.background }]}>
        <StatusBar style={darkMode ? "light" : "dark"} />
        <PinEntryScreen 
          onUnlock={() => setPinUnlocked(true)} 
          onLogout={handleLogout} 
        />
      </View>
    );
  }

  const showNav = !HIDE_NAV.includes(activeScreen) && !showPinRemovalEntry;
  const showFab = !HIDE_FAB.includes(activeScreen) && !showPinRemovalEntry;

  return (
    <View style={[styles.appContainer, { backgroundColor: theme.background }]}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <View style={styles.safeArea}>
        <View style={styles.screenContent}>
          {activeScreen === "home" && (
            <HomeScreen
              onSendMoney={() => navigate("send")}
              onHistory={() => navigate("history")}
              onBeneficiaries={() => navigate("beneficiaries")}
            />
          )}
          {activeScreen === "send" && (
            <SendMoneyFlow
              onBack={() => navigate("home")}
              preselectedRecipient={preselectedRecipient}
            />
          )}
          {activeScreen === "beneficiaries" && (
            <BeneficiariesScreen
              onSendToRecipient={(recipient) => navigate("send", recipient || null)}
            />
          )}
          {activeScreen === "history" && <TransactionHistory />}
          {activeScreen === "profile" && <ProfileScreen onLogout={handleLogout} onPinRemovalShow={setShowPinRemovalEntry} />}
          {activeScreen === "ai-chat" && (
            <AIChatScreen onBack={() => navigate("home")} />
          )}
        </View>

        
        {showNav && showFab && (
          <AnimatedButton
            onPress={() => navigate("ai-chat")}
            style={[
              styles.aiFab,
              { bottom: Platform.OS === "ios" ? 118 : 96 },
            ]}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.gradientFab}
            >
              <Bot size={22} color="#ffffff" />
            </LinearGradient>
          </AnimatedButton>
        )}

        
        {showNav && (
          <View style={styles.navWrapper}>
            <BottomNav active={activeScreen} onNavigate={(scr) => navigate(scr)} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
  },
  screenContent: {
    flex: 1,
  },
  navWrapper: {
    flexShrink: 0,
  },
  aiFab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  gradientFab: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
