import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Platform,
  ActivityIndicator,
  Clipboard,
  Linking,
} from "react-native";
import {
  Search,
  Send,
  Calendar,
  Download,
  Building2,
  ExternalLink,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, Transaction, useTheme, CURRENCY_SYMBOLS } from "../context";
import { BottomSheet } from "./BottomSheet";
import { AnimatedButton } from "./AnimatedButton";

export function TransactionHistory() {
  const {
    transactions,
    fundingSources,
    activeFundingSourceId,
    defaultCurrency,
    darkMode,
    exchangeRates,
    recipients,
  } = useApp();
  const theme = useTheme();

  const curSymbol = CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency;

  const formatAmount = (amt: number, txCurrency?: string) => {
    const targetCurrency = txCurrency || "PHP";
    if (targetCurrency === defaultCurrency) {
      return amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const targetPhpRate = exchangeRates[targetCurrency] || 1;
    const defaultPhpRate = exchangeRates[defaultCurrency] || 1;
    const converted = (amt / targetPhpRate) * defaultPhpRate;
    return converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const primarySource = fundingSources.find((fs) => fs.id === activeFundingSourceId) || fundingSources[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

  const filtered = transactions.filter(
    (tx) =>
      tx.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    // Reset to first page when filter changes
    setPage(1);
  }, [searchQuery, transactions.length]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, filtered.length);

  const handleShare = async (tx: Transaction) => {
    try {
      await Share.share({
        message: `Remittance details: Sent ${curSymbol}${formatAmount(tx.amount, tx.currency)} to ${tx.recipientName}. Ref ID: ${tx.id}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
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
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>ACTIVITY RECORDS</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Transfer History</Text>
        </View>

        
        <View style={[styles.searchBarContainer, { backgroundColor: theme.surface }]}>
          <Search size={18} color="#9aa3b5" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search by recipient or ID..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#9aa3b5" />
            </TouchableOpacity>
          )}
        </View>

        
        <View style={{ gap: 12 }}>
          {paginated.map((tx) => (
            <AnimatedButton
              key={tx.id}
              onPress={() => setSelectedTransaction(tx)}
              style={[styles.txRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.txIconWrapper}>
                <Send size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.txName, { color: theme.text }]} numberOfLines={1}>
                  {tx.recipientName}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(tx.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text style={[styles.txAmt, { color: theme.text }]}>
                  {curSymbol}{formatAmount(tx.amount, tx.currency)}
                </Text>
                <View style={[styles.completedBadge, { backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.15)' : '#f0fff4' }]}>
                  <Text style={[styles.completedText, { color: '#10B981' }]}>COMPLETED</Text>
                </View>
              </View>
            </AnimatedButton>
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyContainer}>
              <Send size={40} color="#9aa3b5" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No transfer records found</Text>
            </View>
          )}

          {/* Pagination controls */}
          {filtered.length > pageSize && (
            <View style={[styles.paginationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={[
                  styles.paginationIconBtn,
                  {
                    opacity: page <= 1 ? 0.35 : 1,
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
              >
                <ChevronLeft size={16} color={theme.text} />
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
                <Text style={[styles.paginationRange, { color: theme.text }]}>
                  Showing {pageStart}-{pageEnd} of {filtered.length}
                </Text>
                <Text style={[styles.paginationMeta, { color: theme.textSecondary }]}>
                  Page {page} of {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={[
                  styles.paginationIconBtn,
                  {
                    opacity: page >= totalPages ? 0.35 : 1,
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Next page"
              >
                <ChevronRight size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      
      <BottomSheet
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <View style={{ gap: 16 }}>
            <View style={[styles.detailCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={[styles.detailHeader, { borderColor: theme.border }]}>
                <View style={styles.detailAvatarWrapper}>
                  <Send size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailName, { color: theme.text }]}>{selectedTransaction.recipientName}</Text>
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

              <View style={[styles.detailRow, { borderColor: theme.border }]}>
                <Text style={styles.detailLabel}>AMOUNT SENT</Text>
                <Text style={[styles.detailValBold, { color: theme.text }]}>
                  {curSymbol}{formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                </Text>
              </View>

              {selectedTransaction.recipientAmount && (
                <View style={[styles.detailRow, { borderColor: theme.border }]}>
                  <Text style={styles.detailLabel}>AMOUNT RECEIVED</Text>
                  <Text style={[styles.detailValBold, { color: "#10B981" }]}>
                    {selectedTransaction.recipientCurrency}{" "}
                    {selectedTransaction.recipientAmount.toLocaleString()}
                  </Text>
                </View>
              )}

              {selectedTransaction.exchangeRate && (() => {
                const recipientObj = recipients.find(r => r.name === selectedTransaction.recipientName);
                let localCurrency = selectedTransaction.recipientCurrency || "PHP";
                if (recipientObj) {
                  localCurrency = recipientObj.currency;
                }
                if (localCurrency === "USD" || localCurrency === "USDT") {
                  localCurrency = "PHP";
                }
                const rateVal = ((exchangeRates[localCurrency] || 1) / (exchangeRates["USD"] || 0.018)).toFixed(localCurrency === "VND" ? 0 : 2);
                return (
                  <View style={[styles.detailRow, { borderColor: theme.border }]}>
                    <Text style={styles.detailLabel}>EXCHANGE RATE</Text>
                    <Text style={[styles.detailVal, { color: theme.text }]}>
                      1 USD = {rateVal} {localCurrency}
                    </Text>
                  </View>
                );
              })()}



              <View style={[styles.detailRow, { borderColor: theme.border }]}>
                <Text style={styles.detailLabel}>TRANSACTION ID</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.detailMono, { color: theme.textSecondary }]}>{selectedTransaction.id}</Text>
                  <TouchableOpacity onPress={() => {
                    Clipboard.setString(selectedTransaction.id);
                    setShowCopiedToast(true);
                    setTimeout(() => setShowCopiedToast(false), 2000);
                  }}>
                    <Copy size={14} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>TXHASH</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {selectedTransaction.txHash ? (
                    <TouchableOpacity onPress={() => {
                      Linking.openURL(`https://explorer-hoodi.morph.network/tx/${selectedTransaction.txHash}`);
                    }}>
                      <Text style={[styles.detailMono, { color: "#10B981", textDecorationLine: "underline" }]}>
                        0x{selectedTransaction.txHash.replace("0x", "").slice(0, 4)}...{selectedTransaction.txHash.slice(-4)}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.detailMono, { color: theme.textSecondary }]}>Not available</Text>
                  )}
                  {selectedTransaction.txHash && (
                    <TouchableOpacity onPress={() => {
                      Clipboard.setString(selectedTransaction.txHash || "");
                      setShowCopiedToast(true);
                      setTimeout(() => setShowCopiedToast(false), 2000);
                    }}>
                      <Copy size={14} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <AnimatedButton
              onPress={() => handleShare(selectedTransaction)}
              style={styles.shareBtnWrapper}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.shareBtn}
              >
                <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Share Details</Text>
              </LinearGradient>
            </AnimatedButton>
          </View>
        )}
      </BottomSheet>

      {showCopiedToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Check size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>Copied!</Text>
          </View>
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
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#2d3748",
    fontWeight: "600",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: "#9aa3b5",
    fontWeight: "600",
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
  hashText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: "#10B981",
    fontWeight: "700",
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
    color: "white",
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
  toastContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  paginationCard: {
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paginationIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  paginationRange: {
    fontSize: 13,
    fontWeight: "700",
  },
  paginationMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
  },
});
