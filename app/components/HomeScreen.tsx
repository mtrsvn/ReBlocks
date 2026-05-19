import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Share,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Send,
  Clock,
  Users,
  ChevronRight,
  Bell,
  X,
  CheckCircle,
  Info,
  ChevronDown,
  Building2,
  CreditCard,
  Calendar,
  Download,
  ExternalLink,
  ArrowRightLeft,
  UserCheck,
  Receipt,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, Transaction } from "../context";
import { BottomSheet } from "./BottomSheet";
import { AnimatedButton } from "./AnimatedButton";
import * as Haptics from "expo-haptics";

const COUNTRIES = [
  { name: "Philippines", flag: "🇵🇭", currency: "PHP", pair: "USD/PHP", rate: 58.42, symbol: "₱" },
  { name: "Singapore", flag: "🇸🇬", currency: "SGD", pair: "USD/SGD", rate: 1.342, symbol: "S$" },
  { name: "Thailand", flag: "🇹🇭", currency: "THB", pair: "USD/THB", rate: 34.65, symbol: "฿" },
  { name: "Vietnam", flag: "🇻🇳", currency: "VND", pair: "USD/VND", rate: 25450, symbol: "₫" },
  { name: "Malaysia", flag: "🇲🇾", currency: "MYR", pair: "USD/MYR", rate: 4.18, symbol: "RM" },
  { name: "Indonesia", flag: "🇮🇩", currency: "IDR", pair: "USD/IDR", rate: 16120, symbol: "Rp" },
];

const formatFXRate = (rate: number) => {
  if (rate >= 1000) {
    return rate.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (rate >= 100) {
    return rate.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (rate < 1) {
    return rate.toFixed(4);
  }
  return rate.toFixed(2);
};

interface HomeScreenProps {
  onSendMoney: () => void;
  onHistory: () => void;
  onBeneficiaries: () => void;
}

export function HomeScreen({ onSendMoney, onHistory, onBeneficiaries }: HomeScreenProps) {
  const {
    fundingSources,
    activeFundingSourceId,
    setActiveFundingSourceId,
    transactions,
    defaultCurrency,
    exchangeRates,
  } = useApp();

  const curSymbol = defaultCurrency === "USD" ? "$" : "₱";

  const formatAmount = (amt: number, txCurrency?: string) => {
    const targetCurrency = txCurrency || "PHP";
    if (targetCurrency === defaultCurrency) {
      return amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (targetCurrency === "PHP" && defaultCurrency === "USD") {
      return (amt * 0.018).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (targetCurrency === "USD" && defaultCurrency === "PHP") {
      return (amt / 0.018).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const notifications = [
    {
      id: "n1",
      title: "Transfer Completed",
      body: `Your transfer of ${curSymbol}${defaultCurrency === "USD" ? "27.00" : "1,500"} to Maria Mendoza was completed successfully.`,
      time: "2 hours ago",
      icon: CheckCircle,
      color: "#48bb78",
      bg: "#f0fff4",
    },
    {
      id: "n2",
      title: "Special Rate Alert",
      body: "USD/PHP is at a 30-day high! Send money now to get the best value.",
      time: "5 hours ago",
      icon: Info,
      color: "#10B981",
      bg: "#d1fae5",
    },
    {
      id: "n3",
      title: "System Update",
      body: "We've upgraded our systems to make your Morph L2 wallet transfers even faster.",
      time: "1 day ago",
      icon: Bell,
      color: "#3182ce",
      bg: "#ebf8ff",
    },
  ];

  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRatesDetail, setShowRatesDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("https://open.er-api.com/v6/latest/USD");
    } catch (e) {
      console.log(e);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const [notifRefreshing, setNotifRefreshing] = useState(false);
  const onNotifRefresh = React.useCallback(() => {
    setNotifRefreshing(true);
    setTimeout(() => {
      setNotifRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  }, []);

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y <= -55 && !refreshing) {
      onRefresh();
    }
  };

  const primarySource =
    fundingSources.find((fs) => fs.id === activeFundingSourceId) ||
    fundingSources[0] ||
    {
      id: "none",
      name: "No funding source",
      provider: "Connect a bank or card",
      type: "bank",
      accountNumber: "—",
    };

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  
  const allRates = COUNTRIES.map((c) => {
    const usdRate = exchangeRates["USD"] || 0.018;
    const curRate = exchangeRates[c.currency] || 1;
    
    const realRate = usdRate > 0 ? curRate / usdRate : c.rate;
    return {
      ...c,
      rate: realRate,
    };
  });

  const handleShare = async (tx: any) => {
    try {
      await Share.share({
        message: `Remittance details: Sent ${curSymbol}${formatAmount(tx.amount, tx.currency)} to ${tx.recipientName}. Ref ID: ${tx.id}`,
      });
    } catch (error) {
      console.log(error);
    }
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
          <View>
            <Text style={styles.headerWelcome}>WELCOME BACK</Text>
            <Text style={styles.headerName}>Carlos Mendoza</Text>
          </View>
          <AnimatedButton
            onPress={() => setShowNotifications(true)}
            style={styles.bellBtn}
          >
            <Bell size={20} color="#10B981" />
            {unreadCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </AnimatedButton>
        </View>

        
        <View style={styles.sourceCardContainer}>
          <AnimatedButton
            onPress={() => setShowAccountSelector(true)}
            style={styles.primaryCardWrapper}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.primaryCard}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSubtitle}>SOURCE OF FUNDS</Text>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{primarySource.name}</Text>
                    <ChevronDown
                      size={16}
                      color="#ffffff"
                    />
                  </View>
                  <Text style={styles.cardProvider}>
                    {primarySource.provider} {primarySource.type === "bank" ? "Account" : "Card"}
                  </Text>
                </View>
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedText}>CONNECTED</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View>
                <Text style={styles.cardSubtitle}>ACCOUNT NUMBER</Text>
                <Text style={styles.cardAccountNum}>{primarySource.accountNumber}</Text>
              </View>
            </LinearGradient>
          </AnimatedButton>
        </View>

        
        <AnimatedButton
          onPress={() => setShowRatesDetail(true)}
          style={styles.flatCard}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>LIVE FX RATES</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>View all</Text>
              <ChevronRight size={14} color="#10B981" />
            </View>
          </View>
          <View style={styles.flagGrid}>
            {allRates.slice(0, 4).map((r, i) => (
              <View key={i} style={styles.flagItem}>
                <Text style={styles.flagEmoji}>{r.flag}</Text>
                <Text style={styles.pairText}>{r.pair}</Text>
                <Text
                  style={styles.rateText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {r.symbol}{formatFXRate(r.rate)}
                </Text>
              </View>
            ))}
          </View>
        </AnimatedButton>

        
        <View style={styles.actionGrid}>
          {[
            {
              label: "Send Money",
              icon: ArrowRightLeft,
              action: onSendMoney,
            },
            {
              label: "Recipients",
              icon: UserCheck,
              action: onBeneficiaries,
            },
            {
              label: "History",
              icon: Receipt,
              action: onHistory,
            },
          ].map(({ label, icon: Icon, action }) => (
            <AnimatedButton
              key={label}
              onPress={action}
              style={styles.gridBtn}
            >
              <View style={styles.actionIconWrapper}>
                <Icon size={20} color="#10B981" />
              </View>
              <Text style={styles.actionLabel}>{label}</Text>
            </AnimatedButton>
          ))}
        </View>

        
        <View style={{ marginTop: 8 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.recentTitle}>Recent Transfers</Text>
            <TouchableOpacity onPress={onHistory} style={styles.linkRow}>
              <Text style={styles.linkText}>View all</Text>
              <ChevronRight size={14} color="#10B981" />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {transactions.length === 0 ? (
              <View style={styles.flatCardRow}>
                <View style={styles.methodIconWrapper}>
                  <Send size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>No transfers yet</Text>
                  <Text style={styles.methodSub}>Your recent activity will appear here</Text>
                </View>
                <ChevronRight size={16} color="#b0b8c8" />
              </View>
            ) : (
              transactions.slice(0, 3).map((tx) => (
                <AnimatedButton
                  key={tx.id}
                  onPress={() => setSelectedTransaction(tx)}
                  style={styles.txRow}
                >
                  <View style={styles.txIconWrapper}>
                    <Send size={18} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.txName} numberOfLines={1}>
                      {tx.recipientName}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <Text style={styles.txAmt}>
                      {curSymbol}{formatAmount(tx.amount, tx.currency)}
                    </Text>
                    <Text style={styles.completedText}>COMPLETED</Text>
                  </View>
                </AnimatedButton>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      
      <Modal
        visible={showNotifications}
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <SafeAreaView style={styles.notifModalContainer}>
          {notifRefreshing && (
            <View style={styles.topRefreshContainer}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          )}

          <View style={styles.notifHeader}>
            <View>
              <Text style={styles.notifHeaderSubtitle}>INBOX</Text>
              <Text style={styles.notifHeaderTitle}>Notifications</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowNotifications(false)}
              style={styles.notifCloseBtn}
            >
              <X size={18} color="#4a5568" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notifScroll}
            onScroll={(event) => {
              const { contentOffset } = event.nativeEvent;
              if (contentOffset.y <= -55 && !notifRefreshing) {
                onNotifRefresh();
              }
            }}
            scrollEventThrottle={16}
            alwaysBounceVertical={true}
          >
            {notifications.map((n) => {
              const Icon = n.icon;
              const isRead = readIds.includes(n.id);
              return (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={0.8}
                  onPress={() => setReadIds((prev) => [...new Set([...prev, n.id])])}
                  style={[styles.notifCard, { opacity: isRead ? 0.6 : 1 }]}
                >
                  <View style={[styles.notifIconWrapper, { backgroundColor: n.bg }]}>
                    <Icon size={18} color={n.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifCardTitle}>{n.title}</Text>
                    <Text style={styles.notifCardBody}>{n.body}</Text>
                    <Text style={styles.notifCardTime}>{n.time}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      
      <BottomSheet
        isOpen={showRatesDetail}
        onClose={() => setShowRatesDetail(false)}
        title="Live Exchange Rates"
      >
        <View style={styles.sheetFXGrid}>
          {allRates.map((r, i) => (
            <View key={i} style={styles.sheetFXItem}>
              <Text style={styles.sheetFXEmoji}>{r.flag}</Text>
              <Text style={styles.sheetFXPair}>{r.pair}</Text>
              <Text
                style={styles.sheetFXRate}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {r.symbol}{formatFXRate(r.rate)}
              </Text>
            </View>
          ))}
        </View>
      </BottomSheet>

      
      <BottomSheet
        isOpen={showAccountSelector}
        onClose={() => setShowAccountSelector(false)}
        title="Select Funding Source"
      >
        <View style={{ gap: 12, paddingBottom: 16 }}>
          {fundingSources.map((source) => {
            const isActive = source.id === activeFundingSourceId;
            const Icon = source.type === "bank" ? Building2 : CreditCard;
            return (
              <TouchableOpacity
                key={source.id}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveFundingSourceId(source.id);
                  setShowAccountSelector(false);
                }}
                style={[
                  styles.popupDropdownRow,
                  isActive && styles.popupDropdownRowActive
                ]}
              >
                <View style={styles.popupDropdownIconWrapper}>
                  <Icon size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupDropdownName}>{source.name}</Text>
                  <Text style={styles.popupDropdownSub}>
                    {source.provider} · •••• {source.last4}
                  </Text>
                </View>
                {isActive && <CheckCircle size={18} color="#10B981" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      
      <BottomSheet
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <View style={{ gap: 16 }}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={styles.detailAvatarWrapper}>
                  <Send size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{selectedTransaction.recipientName}</Text>
                  <View style={styles.detailDateRow}>
                    <Calendar size={10} color="#718096" />
                    <Text style={styles.detailDate}>
                      {new Date(selectedTransaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailBadge}>
                  <Text style={styles.detailBadgeText}>COMPLETED</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>AMOUNT SENT</Text>
                <Text style={styles.detailValBold}>
                  {curSymbol}{formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                </Text>
              </View>

              {selectedTransaction.recipientAmount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>AMOUNT RECEIVED</Text>
                  <Text style={[styles.detailValBold, { color: "#10B981" }]}>
                    {selectedTransaction.recipientCurrency}{" "}
                    {selectedTransaction.recipientAmount.toLocaleString()}
                  </Text>
                </View>
              )}

              {selectedTransaction.exchangeRate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>EXCHANGE RATE</Text>
                  <Text style={styles.detailVal}>
                    1 {selectedTransaction.currency || "PHP"} = {selectedTransaction.recipientCurrency === selectedTransaction.currency ? "1.00" : (selectedTransaction.recipientCurrency === "PHP" ? (1 / (selectedTransaction.exchangeRate || 1)) : (selectedTransaction.exchangeRate || 1)).toFixed(2)} {selectedTransaction.recipientCurrency}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>FEE</Text>
                <Text style={styles.detailVal}>
                  {curSymbol}{formatAmount(selectedTransaction.fee, selectedTransaction.currency)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TRANSACTION ID</Text>
                <Text style={styles.detailMono}>{selectedTransaction.id}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleShare(selectedTransaction)}
              style={styles.shareBtnWrapper}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.shareBtn}
              >
                <ExternalLink size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Share Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerWelcome: {
    fontSize: 10,
    color: "#9aa3b5",
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2d3748",
    marginTop: 2,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeDot: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#e53e3e",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 8,
    fontWeight: "900",
  },
  sourceCardContainer: {
    marginBottom: 20,
  },
  primaryCardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cardProvider: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  connectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  connectedText: {
    color: "white",
    fontSize: 9,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 14,
  },
  cardAccountNum: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginTop: 4,
  },
  popupDropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    gap: 12,
  },
  popupDropdownRowActive: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.04)",
  },
  popupDropdownIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  popupDropdownName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2d3748",
  },
  popupDropdownSub: {
    fontSize: 11,
    color: "#718096",
    fontWeight: "600",
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
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  linkText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  flagGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  flagItem: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  flagEmoji: {
    fontSize: 18,
  },
  pairText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#9aa3b5",
    marginTop: 4,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2d3748",
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  gridBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    color: "#4a5568",
    fontSize: 11,
    fontWeight: "700",
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2d3748",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  txIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  txName: {
    color: "#2d3748",
    fontSize: 13,
    fontWeight: "700",
  },
  txDate: {
    color: "#9aa3b5",
    fontSize: 11,
    marginTop: 2,
  },
  txAmt: {
    color: "#2d3748",
    fontSize: 13,
    fontWeight: "800",
  },
  completedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#f0fff4",
  },
  completedText: {
    color: "#48bb78",
    fontSize: 8,
    fontWeight: "700",
  },
  
  notifModalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 12 : 20,
    paddingBottom: 16,
  },
  notifHeaderSubtitle: {
    fontSize: 10,
    color: "#9aa3b5",
    fontWeight: "700",
    letterSpacing: 1,
  },
  notifHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2d3748",
    marginTop: 2,
  },
  notifCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  notifCard: {
    flexDirection: "row",
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
  notifIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2d3748",
  },
  notifCardBody: {
    fontSize: 12,
    color: "#718096",
    lineHeight: 16,
    marginTop: 3,
  },
  notifCardTime: {
    fontSize: 10,
    color: "#b0b8c8",
    marginTop: 5,
  },
  
  sheetFXGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sheetFXItem: {
    width: "48%",
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sheetFXEmoji: {
    fontSize: 24,
  },
  sheetFXPair: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9aa3b5",
    marginTop: 6,
  },
  sheetFXRate: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2d3748",
    marginTop: 2,
  },
  
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  detailAvatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2d3748",
  },
  detailDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  detailDate: {
    fontSize: 10,
    color: "#718096",
    fontWeight: "600",
  },
  detailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#eef7f2",
  },
  detailBadgeText: {
    color: "#10B981",
    fontSize: 8,
    fontWeight: "800",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9aa3b5",
  },
  detailValBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2d3748",
  },
  detailVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2d3748",
  },
  detailMono: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: "#718096",
  },
  shareBtnWrapper: {
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBtn: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
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
