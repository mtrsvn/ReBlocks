import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  Plus,
  Search,
  X,
  Send,
  Building2,
  User,
  Check,
  ChevronDown,
  MoreVertical,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, Recipient, useTheme } from "../context";
import { BottomSheet } from "./BottomSheet";
import { AnimatedButton } from "./AnimatedButton";
import {
  COUNTRIES,
  getPaymentMethods,
  getCountryFlag,
  getCountryCurrency,
} from "../utils/countries";

interface BeneficiariesScreenProps {
  onSendToRecipient: (recipient?: Recipient) => void;
}

export function BeneficiariesScreen({ onSendToRecipient }: BeneficiariesScreenProps) {
  const {
    recipients,
    addRecipient,
    deleteRecipient,
    fundingSources,
    activeFundingSourceId,
  } = useApp();
  const theme = useTheme();

  const primarySource = fundingSources.find((fs) => fs.id === activeFundingSourceId) || fundingSources[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

  
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("ph");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");

  
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const filtered = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bankName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    addRecipient({
      name,
      countryCode,
      currency: getCountryCurrency(countryCode),
      bankName: bank,
      accountNumber: account,
      type: bank.toLowerCase().includes("bank") ? "bank" : "wallet",
    });
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setCountryCode("ph");
    setBank("");
    setAccount("");
  };

  const paymentMethods = getPaymentMethods(countryCode);

  const getCountryName = (code: string) => {
    return COUNTRIES.find((c) => c.code === code)?.name || code;
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
          <View>
            <Text style={styles.headerSubtitle}>SAVED CONTACTS</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Recipients</Text>
          </View>
          <AnimatedButton
            onPress={() => setIsAdding(true)}
            style={styles.addBtnWrapper}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.addBtn}
            >
              <Plus size={22} color="#ffffff" />
            </LinearGradient>
          </AnimatedButton>
        </View>

        
        <View style={[styles.searchBarContainer, { backgroundColor: theme.surface }]}>
          <Search size={18} color="#9aa3b5" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search by name or bank..."
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
          {filtered.map((r) => (
            <View key={r.id} style={[styles.recipientCard, { backgroundColor: theme.surface }]}>
              <AnimatedButton
                onPress={() => setSelectedRecipient(r)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
              >
                <View style={styles.avatarWrapper}>
                  <User size={18} color="#ffffff" />
                </View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <Text style={[styles.recipientName, { color: theme.text }]} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <View style={styles.recipientSubRow}>
                    <Text style={styles.flagText}>{getCountryFlag(r.countryCode)}</Text>
                    <Text style={styles.bankNameText} numberOfLines={1}>
                      {r.bankName}
                    </Text>
                  </View>
                </View>
              </AnimatedButton>
              <TouchableOpacity
                onPress={() => setSelectedRecipient(r)}
                style={styles.menuBtn}
              >
                <MoreVertical size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyContainer}>
              <User size={40} color="#9aa3b5" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No recipients found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      
      <BottomSheet
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="New Recipient"
      >
        <View style={{ gap: 16 }}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ACCOUNT NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Maria Mendoza"
              placeholderTextColor={theme.textSecondary}
              style={[styles.inputField, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            />
          </View>

          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>COUNTRY</Text>
            <AnimatedButton
              onPress={() => setShowCountryPicker(true)}
              style={[styles.selectBox, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.selectBoxText, { color: theme.text }]}>
                {getCountryFlag(countryCode)} {getCountryName(countryCode)}
              </Text>
              <ChevronDown size={16} color="#9aa3b5" />
            </AnimatedButton>
          </View>

          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PAYMENT METHOD</Text>
            <AnimatedButton
              onPress={() => setShowBankPicker(true)}
              style={[styles.selectBox, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.selectBoxText, { color: theme.text }, !bank && { color: "#9aa3b5" }]}>
                {bank || "Select Bank or Wallet"}
              </Text>
              <ChevronDown size={16} color="#9aa3b5" />
            </AnimatedButton>
          </View>

          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ACCOUNT NUMBER</Text>
            <TextInput
              value={account}
              onChangeText={setAccount}
              keyboardType="numeric"
              placeholder="e.g. 0917 123 4567"
              placeholderTextColor={theme.textSecondary}
              style={[styles.inputField, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            />
          </View>

          
          <AnimatedButton
            disabled={!name || !bank || !account}
            onPress={handleSave}
            style={[
              styles.saveBtnWrapper,
              (!name || !bank || !account) && styles.saveBtnDisabled,
            ]}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Recipient</Text>
            </LinearGradient>
          </AnimatedButton>
        </View>
      </BottomSheet>

      
      <BottomSheet
        isOpen={!!selectedRecipient}
        onClose={() => setSelectedRecipient(null)}
        title="Recipient Details"
      >
        {selectedRecipient && (
          <View style={{ gap: 16 }}>
            
            <View style={[styles.detailCard, { backgroundColor: theme.background }]}>
              <View style={styles.detailAvatarWrapper}>
                <Text style={styles.detailAvatarInitials}>
                  {selectedRecipient.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.detailName, { color: theme.text }]}>{selectedRecipient.name}</Text>
              <Text style={styles.detailUsername}>
                @{selectedRecipient.name.toLowerCase().replace(/\s+/g, "")}
              </Text>
              <View style={styles.detailCountryBadge}>
                <Text style={styles.detailCountryText}>
                  {getCountryFlag(selectedRecipient.countryCode)}{" "}
                  {getCountryName(selectedRecipient.countryCode).toUpperCase()}
                </Text>
              </View>
            </View>

            
            <View style={[styles.detailInfoBox, { backgroundColor: theme.background }]}>
              <View style={[styles.detailRow, { borderColor: theme.border }]}>
                <Text style={styles.detailLabel}>PAYMENT METHOD</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Building2 size={14} color="#10B981" />
                  <Text style={[styles.detailValBold, { color: theme.text }]}>{selectedRecipient.bankName}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { borderColor: theme.border }]}>
                <Text style={styles.detailLabel}>ACCOUNT NUMBER</Text>
                <Text style={[styles.detailMono, { color: theme.textSecondary }]}>{selectedRecipient.accountNumber}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>CURRENCY</Text>
                <Text style={[styles.detailValBold, { color: theme.text }]}>{selectedRecipient.currency}</Text>
              </View>
            </View>

            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <AnimatedButton
                onPress={() => {
                  onSendToRecipient(selectedRecipient);
                  setSelectedRecipient(null);
                }}
                style={styles.actionSendBtnWrapper}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.actionSendBtn}
                >
                  <Send size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionSendText}>SEND MONEY</Text>
                </LinearGradient>
              </AnimatedButton>

              <AnimatedButton
                onPress={() => {
                  deleteRecipient(selectedRecipient.id);
                  setSelectedRecipient(null);
                }}
                style={styles.actionDeleteBtn}
              >
                <Text style={styles.actionDeleteText}>DELETE</Text>
              </AnimatedButton>
            </View>
          </View>
        )}
      </BottomSheet>

      
      <Modal visible={showCountryPicker} animationType="slide" transparent>
        <View style={styles.pickerModalOverlay}>
          <SafeAreaView style={[styles.pickerModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.pickerHeader, { borderColor: theme.border }]}>
              <Text style={[styles.pickerHeaderTitle, { color: theme.text }]}>Select Country</Text>
              <AnimatedButton onPress={() => setShowCountryPicker(false)}>
                <X size={20} color={theme.icon} />
              </AnimatedButton>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCountryCode(item.code);
                    setBank(""); 
                    setShowCountryPicker(false);
                  }}
                  style={[
                    styles.pickerRow,
                    { borderColor: theme.border },
                    countryCode === item.code && [styles.pickerRowActive, { backgroundColor: theme.border }],
                  ]}
                >
                  <Text style={styles.pickerFlag}>{item.flag}</Text>
                  <Text style={[styles.pickerName, { color: theme.text }]}>{item.name}</Text>
                  {countryCode === item.code && <Check size={18} color="#10B981" />}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      
      <Modal visible={showBankPicker} animationType="slide" transparent>
        <View style={styles.pickerModalOverlay}>
          <SafeAreaView style={[styles.pickerModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.pickerHeader, { borderColor: theme.border }]}>
              <Text style={[styles.pickerHeaderTitle, { color: theme.text }]}>Select Payment Method</Text>
              <AnimatedButton onPress={() => setShowBankPicker(false)}>
                <X size={20} color={theme.icon} />
              </AnimatedButton>
            </View>
            <FlatList
              data={paymentMethods}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setBank(item);
                    setShowBankPicker(false);
                  }}
                  style={[styles.pickerRow, { borderColor: theme.border }, bank === item && [styles.pickerRowActive, { backgroundColor: theme.border }]]}
                >
                  <Building2 size={16} color="#10B981" style={{ marginRight: 12 }} />
                  <Text style={[styles.pickerName, { color: theme.text }]}>{item}</Text>
                  {bank === item && <Check size={18} color="#10B981" />}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  addBtnWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
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
  recipientCard: {
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
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientName: {
    color: "#2d3748",
    fontSize: 13,
    fontWeight: "700",
  },
  recipientSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  flagText: {
    fontSize: 12,
  },
  bankNameText: {
    color: "#9aa3b5",
    fontSize: 11,
    fontWeight: "600",
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
  
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9aa3b5",
    marginLeft: 4,
  },
  inputField: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: "#2d3748",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectBoxText: {
    fontSize: 13,
    color: "#2d3748",
    fontWeight: "600",
  },
  saveBtnWrapper: {
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  detailAvatarInitials: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },
  detailName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2d3748",
  },
  detailUsername: {
    fontSize: 11,
    color: "#9aa3b5",
    fontWeight: "600",
    marginTop: 2,
  },
  detailCountryBadge: {
    marginTop: 10,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  detailCountryText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
  },
  detailInfoBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  detailMono: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontWeight: "700",
    color: "#2d3748",
  },
  actionSendBtnWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionSendBtn: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionSendText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
  },
  actionDeleteBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionDeleteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2d3748",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f7fafc",
  },
  pickerRowActive: {
    backgroundColor: "#f0fff4",
  },
  pickerFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  pickerName: {
    flex: 1,
    fontSize: 14,
    color: "#2d3748",
    fontWeight: "600",
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
