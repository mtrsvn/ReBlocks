import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
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
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context";
import { AnimatedButton } from "./AnimatedButton";

export function ProfileScreen() {
  const { fundingSources } = useApp();
  const [biometric, setBiometric] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const settingSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Personal Information", sublabel: "Name, address, birthday", color: "#10B981" },
        { icon: Phone, label: "Phone Number", sublabel: "+63 912 345 6789", color: "#10B981" },
        { icon: Mail, label: "Email Address", sublabel: "carlos.mendoza@email.com", color: "#10B981" },
      ],
    },
    {
      title: "Security",
      items: [
        { icon: Lock, label: "Change PIN", sublabel: "Last changed 30 days ago", color: "#10B981" },
        { icon: Shield, label: "Two-Factor Auth", sublabel: "Enabled via SMS", color: "#10B981", badge: "ON" },
        { icon: Eye, label: "Biometric Login", sublabel: "Face ID / Fingerprint", color: "#10B981", toggle: true, toggleVal: biometric, onToggle: setBiometric },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Bell, label: "Notifications", sublabel: "Transfers, promotions", color: "#10B981", toggle: true, toggleVal: notifications, onToggle: setNotifications },
        { icon: MapPin, label: "Default Currency", sublabel: "PHP — Philippine Peso", color: "#10B981" },
        { icon: HelpCircle, label: "Help & Support", sublabel: "FAQs, contact us", color: "#10B981" },
      ],
    },
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>CM</Text>
              </View>
              <AnimatedButton
                style={styles.cameraBtnWrapper}
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
              <Text style={styles.profileName}>Carlos Mendoza</Text>
              <Text style={styles.profileEmail}>carlos.mendoza@email.com</Text>
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
                    {!isLast && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <AnimatedButton style={styles.signOutBtn}>
          <LogOut size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </AnimatedButton>

        {/* App Version */}
        <Text style={styles.versionText}>v2.4.1 · Powered by AI</Text>
      </ScrollView>
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
    fontSize: 22,
    fontWeight: "800",
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
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#d1fae5",
  },
  premiumText: {
    color: "#10B981",
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
});
