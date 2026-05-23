import React, { useState,useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Platform,
  Dimensions,
  Clipboard,
  Linking,
} from "react-native";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  CheckCircle,
  Share2,
  ArrowRight,
  Building2,
  CreditCard,
  Banknote,
  Info,
  Zap,
  QrCode,
  X,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AnimatedButton } from "./AnimatedButton";
import { useApp, Recipient, useTheme } from "../context";
import { getCountryFlag } from "../utils/countries";
import { MorphCheckoutMock } from "./MorphCheckout";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COUNTRIES = [
  { name: "Philippines", code: "PH", currency: "PHP", flag: "🇵🇭", banks: ["GCash", "Maya", "BDO", "BPI"] },
  { name: "Singapore", code: "SG", currency: "SGD", flag: "🇸🇬", banks: ["DBS", "OCBC", "UOB", "GrabPay"] },
  { name: "Thailand", code: "TH", currency: "THB", flag: "🇹🇭", banks: ["Bangkok Bank", "Kasikorn Bank", "SCB", "TrueMoney"] },
  { name: "Vietnam", code: "VN", currency: "VND", flag: "🇻🇳", banks: ["Vietcombank", "BIDV", "VietinBank", "MoMo"] },
  { name: "Malaysia", code: "MY", currency: "MYR", flag: "🇲🇾", banks: ["Maybank", "CIMB", "Public Bank", "Touch n Go"] },
  { name: "Indonesia", code: "ID", currency: "IDR", flag: "🇮🇩", banks: ["BCA", "Mandiri", "BRI", "GoPay"] },
];

interface SendMoneyFlowProps {
  onBack: () => void;
  preselectedRecipient?: Recipient | null;
  prefilledAmount?: number;
  prefilledCurrency?: string;
}

export function SendMoneyFlow({ onBack, preselectedRecipient, prefilledAmount, prefilledCurrency }: SendMoneyFlowProps) {
  const {
    recipients,
    fundingSources,
    exchangeRates,
    addTransaction,
    addRecipient,
    activeFundingSourceId,
    defaultCurrency,
  } = useApp();
  const theme = useTheme();

  const primarySource = fundingSources.find((fs) => fs.id === activeFundingSourceId) || fundingSources[0];

  const [step, setStep] = useState(preselectedRecipient ? 2 : 1);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(preselectedRecipient || null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showMoonPay, setShowMoonPay] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();

  
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState(COUNTRIES[0]);
  const [newBank, setNewBank] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");

  
  const [sendAmount, setSendAmount] = useState(prefilledAmount !== undefined ? String(prefilledAmount) : "");
  const [sendCurrency, setSendCurrency] = useState(
    prefilledCurrency || (preselectedRecipient ? preselectedRecipient.currency : (defaultCurrency === "USD" ? "USD" : "PHP"))
  );

  useEffect(() => {
    if (prefilledAmount !== undefined) {
      setSendAmount(String(prefilledAmount));
    }
  }, [prefilledAmount]);

  useEffect(() => {
    if (prefilledCurrency) {
      setSendCurrency(prefilledCurrency);
    }
  }, [prefilledCurrency]);

  const curSymbol = defaultCurrency === "USD" ? "$" : "₱";
  const baseFee = 0;

  const exchangeRate = exchangeRates[sendCurrency] || 1;
  const defaultCurRate = exchangeRates[defaultCurrency] || (defaultCurrency === "USD" ? 0.018 : 1);
  const receiveAmount = parseFloat(sendAmount) || 0;
  const targetCurrency = selectedRecipient ? selectedRecipient.currency : newCountry.currency;
  const finalRecipientAmount = sendCurrency === "USD" && targetCurrency !== "USD" ? receiveAmount * (exchangeRates[targetCurrency] / exchangeRates["USD"]) : receiveAmount;

  const phpValue = sendCurrency === "PHP" ? receiveAmount : (exchangeRate !== 0 ? receiveAmount / exchangeRate : 0);
  const baseEquivalent = phpValue * defaultCurRate;
  const totalToPay = baseEquivalent + baseFee;

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => {
    if (step === 1) {
      if (showQRScanner) {
        setShowQRScanner(false);
      } else if (isAddingNew) {
        setIsAddingNew(false);
      } else {
        onBack();
      }
    } else if (step === 2 && preselectedRecipient) {
      onBack();
    } else {
      setStep((prev) => prev - 1);
    }
  };

  const startQRScanner = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        alert("Camera permission is required to scan QR codes.");
        return;
      }
    }
    setShowQRScanner(true);
  };

  const handleConfirm = () => {
    const recipient = selectedRecipient || {
      name: newName,
      bankName: newBank,
      countryCode: newCountry.code.toLowerCase(),
      currency: newCountry.currency,
    };

    // Automatically save recipient if not already saved
    if (!selectedRecipient) {
      const existingRecipient = recipients.find(
        (r) => r.name.toLowerCase() === newName.toLowerCase() && r.bankName.toLowerCase() === newBank.toLowerCase()
      );
      if (!existingRecipient) {
        addRecipient({
          name: newName,
          bankName: newBank,
          countryCode: newCountry.code.toLowerCase(),
          currency: newCountry.currency,
          accountNumber: newAccountNumber || "",
          type: newBank.toLowerCase().includes("bank") ? "bank" : "wallet",
        });
      }
    }

    setShowMoonPay(true);
  };
  
  const handleShare = async () => {
    try {
      let shareMessage = `Remittance details: Sent ${sendCurrency} ${receiveAmount.toLocaleString()} to ${selectedRecipient?.name || newName}.`;
      if (baseFee > 0) {
        shareMessage += ` Fee: ${curSymbol}${baseFee.toFixed(2)}.`;
      }
      shareMessage += ` Sent via Reblocks.`;

      await Share.share({ message: shareMessage });
    } catch (error) {
      console.log(error);
    }
  };

  const stepLabels = ["Recipient", "Amount", "Review", "Done"];


  const [l2Status, setL2Status] = useState("DISPATCHING");
  const [showTxHash, setShowTxHash] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [firebaseTxId, setFirebaseTxId] = useState("");
  const [showCopiedToast, setShowCopiedToast] = useState(false);

useEffect(() => {
  if (step === 4) {
    setL2Status("PENDING...");
    setShowTxHash(false);

    const timer1 = setTimeout(() => {
      setL2Status("CONFIRMING...");
    }, 1000);

    const timer2 = setTimeout(() => {
      setL2Status("FINALIZED");
      setShowTxHash(false);
    }, 3000);

    const timer3 = setTimeout(() => {
      setL2Status("COMPLETED");
      setShowTxHash(true);
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }
}, [step]);

  if (showMoonPay) {
    return (
      <MorphCheckoutMock 
        amount={totalToPay}
        onBack={() => setShowMoonPay(false)}
        onPaymentSuccess={(hash: string) => {
          setShowMoonPay(false);
          setTxHash(hash);
          
          const addTxAsync = async () => {
            const newId = await addTransaction({
              type: "send",
              amount: totalToPay,
              currency: defaultCurrency,
              recipientAmount: receiveAmount,
              recipientCurrency: sendCurrency,
              recipientName: selectedRecipient?.name || newName,
              fee: baseFee,
              exchangeRate: sendCurrency === defaultCurrency ? 1 : ((defaultCurRate / exchangeRate) || 0),
              fundingSourceId: primarySource?.id || "",
              estimatedArrival: "Instant",
              txHash: hash,
            });
            if (newId) setFirebaseTxId(newId);
          };
          addTxAsync();

          setStep(4);
        }}
      />
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      
      <View style={styles.header}>
        <AnimatedButton
          onPress={handleBack}
          style={[styles.backBtn, { backgroundColor: theme.surface }]}
        >
          <ArrowLeft size={18} color={theme.icon} />
        </AnimatedButton>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>International Transfer</Text>
          <Text style={styles.headerSubtitle}>
            Step {step} of 4 · {stepLabels[step - 1]}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        
        {step === 1 && (
          <View style={{ gap: 16 }}>
            {showQRScanner ? (
              <View style={styles.qrScannerContainer}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  onBarcodeScanned={({ data }) => {
                    if (data) {
                      setShowQRScanner(false);
                      setIsAddingNew(true);
                      
                      const parts = data.split(",");
                      if (parts.length >= 4) {
                        setNewName(parts[0].trim());
                        const matchedCountry = COUNTRIES.find(c => c.code.toLowerCase() === parts[1].trim().toLowerCase());
                        if (matchedCountry) setNewCountry(matchedCountry);
                        setNewBank(parts[2].trim());
                        setNewAccountNumber(parts[3].trim());
                      } else {
                        
                        setNewName(data.substring(0, 35));
                        setNewCountry(COUNTRIES[0]);
                        setNewBank("GCash");
                        setNewAccountNumber("09171234567");
                      }
                    }
                  }}
                />
                <View style={styles.qrBezel}>
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />
                  <QrCode size={100} color="rgba(255,255,255,0.2)" />
                </View>
                <Text style={styles.qrScannerText}>Align QR code inside container</Text>
              </View>
            ) : !isAddingNew ? (
              <>
                <View style={styles.rowGrid}>
                  <AnimatedButton
                    onPress={() => setIsAddingNew(true)}
                    style={styles.dashedBtn}
                  >
                    <Text style={styles.dashedBtnText}>+ Add Manual</Text>
                  </AnimatedButton>

                  <AnimatedButton
                    onPress={startQRScanner}
                    style={styles.qrScanBtnWrapper}
                  >
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={styles.qrScanBtn}
                    >
                      <QrCode size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.qrScanBtnText}>Scan QR</Text>
                    </LinearGradient>
                  </AnimatedButton>
                </View>

                
                <View style={{ gap: 10 }}>
                  <Text style={styles.sectionLabel}>SAVED RECIPIENTS</Text>
                  {recipients.map((r) => (
                    <AnimatedButton
                      key={r.id}
                      onPress={() => {
                        setSelectedRecipient(r);
                        setSendCurrency(r.currency);
                        handleNext();
                      }}
                      style={[styles.flatCardRow, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                    >
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{r.name.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recipientName, { color: theme.text }]}>{r.name}</Text>
                        <Text style={styles.recipientSub}>
                          {r.bankName} · {getCountryFlag(r.countryCode)}{" "}
                          {r.countryCode.toUpperCase()}
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#b0b8c8" />
                    </AnimatedButton>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ gap: 16 }}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.formLabel}>RECIPIENT FULL NAME</Text>
                  <TextInput
                    placeholder="e.g. Maria Santos"
                    placeholderTextColor="#9aa3b5"
                    value={newName}
                    onChangeText={setNewName}
                    style={[styles.inputField, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.formLabel}>COUNTRY</Text>
                  <View style={styles.countryGrid}>
                    {COUNTRIES.map((c) => {
                      const isSelected = newCountry.code === c.code;
                      return (
                        <AnimatedButton
                          key={c.code}
                          onPress={() => {
                            setNewCountry(c);
                            setNewBank("");
                          }}
                          style={[
                            styles.countryGridBtn,
                            { backgroundColor: theme.surface, borderColor: theme.border },
                            isSelected && styles.countryGridBtnActive,
                          ]}
                        >
                          <Text style={styles.countryGridEmoji}>{c.flag}</Text>
                          <Text
                            style={[
                              styles.countryGridLabel,
                              { color: theme.text },
                              isSelected && { color: "#ffffff" },
                            ]}
                          >
                            {c.name}
                          </Text>
                        </AnimatedButton>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.formLabel}>PROVIDER</Text>
                  <View style={styles.bankSelectRow}>
                    {newCountry.banks.map((b) => {
                      const isSelected = newBank === b;
                      return (
                        <AnimatedButton
                          key={b}
                          onPress={() => setNewBank(b)}
                          style={[
                            styles.bankGridBtn,
                            { backgroundColor: theme.surface, borderColor: theme.border },
                            isSelected && styles.bankGridBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bankGridLabel,
                              { color: theme.text },
                              isSelected && { color: "#ffffff" },
                            ]}
                          >
                            {b}
                          </Text>
                        </AnimatedButton>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.formLabel}>ACCOUNT NUMBER / PHONE</Text>
                  <TextInput
                    placeholder="e.g. 0917 123 4567"
                    placeholderTextColor="#9aa3b5"
                    keyboardType="numeric"
                    value={newAccountNumber}
                    onChangeText={setNewAccountNumber}
                    style={[styles.inputField, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  />
                </View>

                <AnimatedButton
                  disabled={!newName || !newBank || !newAccountNumber}
                  onPress={() => {
                    setSendCurrency(newCountry.currency);
                    handleNext();
                  }}
                  style={[
                    styles.primaryBtnWrapper,
                    (!newName || !newBank || !newAccountNumber) && styles.disabledBtn,
                  ]}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Continue</Text>
                  </LinearGradient>
                </AnimatedButton>
              </View>
            )}
          </View>
        )}

        
        {step === 2 && (
          <View style={{ gap: 20 }}>
            
            <View style={[styles.flatCardRow, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(selectedRecipient?.name || newName).charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recipientName, { color: theme.text }]}>
                  {selectedRecipient?.name || newName}
                </Text>
                <Text style={styles.recipientSub}>
                  {selectedRecipient?.bankName || newBank} ({sendCurrency})
                </Text>
              </View>
            </View>

            
            <View style={[styles.flatCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={[styles.inputCardLabel, { marginBottom: 0 }]}>Amount to Send ({sendCurrency})</Text>
                <AnimatedButton
                  onPress={() => {
                    const usdToTargetRate = exchangeRates[targetCurrency] / (exchangeRates["USD"] || 0.018);
                    if (sendCurrency === "USD") {
                      const newAmount = receiveAmount * usdToTargetRate;
                      setSendAmount(newAmount > 0 ? newAmount.toFixed(targetCurrency === "VND" ? 0 : 2) : "");
                      setSendCurrency(targetCurrency);
                    } else {
                      const newAmount = receiveAmount / usdToTargetRate;
                      setSendAmount(newAmount > 0 ? newAmount.toFixed(2) : "");
                      setSendCurrency("USD");
                    }
                  }}
                  style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#10B981" }}>
                    SWITCH TO {sendCurrency === "USD" ? targetCurrency : "USD"}
                  </Text>
                </AnimatedButton>
              </View>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>{sendCurrency}</Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="numeric"
                  autoFocus
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  style={[styles.largeAmountInput, { color: theme.text }]}
                />
              </View>
            </View>

            
            <View style={[styles.calcInsetCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.calcRow}>
                <View style={styles.labelCol}>
                  <Banknote size={14} color="#9aa3b5" style={{ marginRight: 6 }} />
                  <Text style={styles.calcLabel}>Exchange Rate</Text>
                </View>
                <Text style={[styles.calcVal, { color: theme.text }]}>
                  {sendCurrency === "USD" && targetCurrency !== "USD" ? (
                    `1 USD = ${(exchangeRates[targetCurrency] / exchangeRates["USD"]).toLocaleString(undefined, { maximumFractionDigits: targetCurrency === "VND" ? 0 : 4 })} ${targetCurrency}`
                  ) : (
                    `1 ${sendCurrency} = ${sendCurrency === defaultCurrency
                      ? "1.00"
                      : ((defaultCurRate / exchangeRate) || 0).toFixed(sendCurrency === "VND" ? 6 : 4)} ${defaultCurrency}`
                  )}
                </Text>
              </View>

              {baseFee > 0 && (
                <View style={styles.calcRow}>
                  <View style={styles.labelCol}>
                    <Info size={14} color="#9aa3b5" style={{ marginRight: 6 }} />
                    <Text style={styles.calcLabel}>Transfer Fee</Text>
                  </View>
                  <Text style={[styles.calcVal, { color: theme.text }]}>{curSymbol}{baseFee.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.calcRow}>
                <View style={styles.labelCol}>
                  <Zap size={14} color="#9aa3b5" style={{ marginRight: 6 }} />
                  <Text style={styles.calcLabel}>Estimated Arrival</Text>
                </View>
                <Text style={[styles.calcVal, { color: "#10B981" }]}>Instant</Text>
              </View>

              <View style={styles.calcRow}>
                <View style={styles.labelCol}>
                  <ArrowRight size={14} color="#9aa3b5" style={{ marginRight: 6 }} />
                  <Text style={styles.calcLabel}>Recipient Receives</Text>
                </View>
                <Text style={[styles.calcVal, { color: "#10B981" }]}>
                  {finalRecipientAmount.toLocaleString(undefined, { minimumFractionDigits: targetCurrency === "VND" ? 0 : 2, maximumFractionDigits: targetCurrency === "VND" ? 0 : 2 })} {targetCurrency}
                </Text>
              </View>

              <View style={[styles.calcDivider, { backgroundColor: theme.border }]} />

              <View style={[styles.calcRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={[styles.calcTotalLabel, { color: theme.text }]}>Total to Pay</Text>
                <Text style={styles.calcTotalVal}>
                  {curSymbol}{totalToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            
            <AnimatedButton
              disabled={!sendAmount || parseFloat(sendAmount) <= 0}
              onPress={handleNext}
              style={[
                styles.primaryBtnWrapper,
                (!sendAmount || parseFloat(sendAmount) <= 0) && styles.disabledBtn,
              ]}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Review Transfer</Text>
              </LinearGradient>
            </AnimatedButton>
          </View>
        )}

        
        {step === 3 && (
          <View style={{ gap: 20 }}>
            <Text style={styles.instructionText}>
              Please verify the details before payment.
            </Text>

            {/* Review Card */}
            <View style={[styles.flatCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.reviewFlowRow}>
                <View style={styles.reviewCol}>
                  <Text style={styles.reviewCap}>PAYING</Text>
                  <Text style={[styles.reviewAmt, { color: theme.text }]}>{curSymbol}{totalToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  <Text style={styles.reviewSub}>{defaultCurrency}</Text>
                </View>

                <View style={styles.flowArrowCircle}>
                  <ArrowRight size={16} color="#10B981" />
                </View>

                <View style={styles.reviewCol}>
                  <Text style={styles.reviewCap}>RECEIVING</Text>
                  <Text style={[styles.reviewAmt, { color: "#10B981" }]}>
                    {targetCurrency} {finalRecipientAmount.toLocaleString(undefined, { minimumFractionDigits: targetCurrency === "VND" ? 0 : 2, maximumFractionDigits: targetCurrency === "VND" ? 0 : 2 })}
                  </Text>
                  <Text style={styles.reviewSub}>
                    {selectedRecipient?.bankName || newBank}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

              <View style={{ gap: 10 }}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Recipient</Text>
                  <Text style={[styles.calcValBold, { color: theme.text }]}>
                    {selectedRecipient?.name || newName}
                  </Text>
                </View>

                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Exchange Rate</Text>
                  <Text style={[styles.calcValBold, { color: theme.text }]}>
                    {sendCurrency === "USD" && targetCurrency !== "USD" ? (
                      `1 USD = ${(exchangeRates[targetCurrency] / exchangeRates["USD"]).toLocaleString(undefined, { maximumFractionDigits: targetCurrency === "VND" ? 0 : 4 })} ${targetCurrency}`
                    ) : (
                      `1 ${sendCurrency} = ${sendCurrency === defaultCurrency
                        ? "1.00"
                        : ((defaultCurRate / exchangeRate) || 0).toFixed(sendCurrency === "VND" ? 6 : 4)} ${defaultCurrency}`
                    )}
                  </Text>
                </View>

                {baseFee > 0 && (
                  <View style={[styles.calcRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.calcLabel}>Fee</Text>
                    <Text style={[styles.calcValBold, { color: theme.text }]}>{curSymbol}{baseFee.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>

            
            <AnimatedButton
              onPress={handleConfirm}
              style={styles.primaryBtnWrapper}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Pay & Send Money</Text>
              </LinearGradient>
            </AnimatedButton>
          </View>
        )}

        
        {step === 4 && (
          <View style={styles.successContainer}>
            <View style={styles.successIconWrapper}>
              <CheckCircle size={44} color="#10B981" />
            </View>

            <Text style={[styles.successTitle, { color: theme.text }]}>Remittance Sent!</Text>
            <Text style={styles.successSubtitle}>
              Funds are being delivered to {selectedRecipient?.name || newName}
            </Text>

            
            <View style={[styles.calcInsetCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Transaction ID</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.calcMono, { color: theme.text }]}>
                    {firebaseTxId || "Pending..."}
                  </Text>
                  {firebaseTxId ? (
                    <TouchableOpacity onPress={() => {
                      Clipboard.setString(firebaseTxId);
                      setShowCopiedToast(true);
                      setTimeout(() => setShowCopiedToast(false), 2000);
                    }}>
                      <Copy size={14} color="#10B981" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Amount Delivered</Text>
                <Text style={[styles.calcValBold, { color: "#10B981" }]}>
                  {sendCurrency} {parseFloat(sendAmount).toLocaleString()}
                </Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Total Paid</Text>
                <Text style={[styles.calcValBold, { color: theme.text }]}>{curSymbol}{totalToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>

              <View style={[styles.calcDivider, { backgroundColor: theme.border }]} />


              <View style={[styles.calcRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                 <Text style={styles.calcLabel}>L2 Status</Text>
                 <View style={styles.successStatusBadge}>
                   <Text style={styles.successStatusText}>
                     {l2Status}
                   </Text>
                  </View>
                </View>

                        <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Tx Hash</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {showTxHash ? (
                  <TouchableOpacity onPress={() => {
                    const hashToOpen = txHash || "0x5f9a8d2e";
                    Linking.openURL(`https://explorer-hoodi.morph.network/tx/${hashToOpen}`);
                  }}>
                    <Text style={[styles.calcMono, { color: theme.primary, textDecorationLine: "underline" }]}>
                      {txHash ? `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}` : "0x5f9a...8d2e"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.calcMono, { color: theme.primary }]}>
                    {"            "}
                  </Text>
                )}
                {showTxHash && (
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity onPress={() => {
                      Clipboard.setString(txHash || "0x5f9a8d2e");
                      setShowCopiedToast(true);
                      setTimeout(() => setShowCopiedToast(false), 2000);
                    }}>
                      <Copy size={14} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      const hashToOpen = txHash || "0x5f9a8d2e";
                      Linking.openURL(`https://explorer-hoodi.morph.network/tx/${hashToOpen}`);
                    }}>
                      <ExternalLink size={14} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            </View>
            

            
            <View style={{ width: "100%", gap: 12 }}>
              <AnimatedButton
                onPress={handleShare}
                style={[styles.shareBtn, { backgroundColor: theme.surface }]}
              >
                <Share2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Share Details</Text>
              </AnimatedButton>

              <AnimatedButton
                onPress={onBack}
                style={styles.primaryBtnWrapper}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Back to Home</Text>
                </LinearGradient>
              </AnimatedButton>
            </View>
          </View>
        )}
      </ScrollView>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2d3748",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#9aa3b5",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 190,
  },
  rowGrid: {
    flexDirection: "row",
    gap: 12,
  },
  dashedBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  dashedBtnText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "800",
  },
  qrScanBtnWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  qrScanBtn: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  qrScanBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9aa3b5",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
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
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "800",
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2d3748",
  },
  recipientSub: {
    fontSize: 11,
    color: "#9aa3b5",
    fontWeight: "600",
    marginTop: 2,
  },
  
  qrScannerContainer: {
    height: 380,
    borderRadius: 24,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    overflow: "hidden",
  },
  qrBezel: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#ffffff",
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  qrScannerText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 20,
    zIndex: 10,
  },
  qrCancelBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    zIndex: 10,
  },
  qrCancelText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  
  inputGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9aa3b5",
    letterSpacing: 0.8,
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
  countryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  countryGridBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  countryGridBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  countryGridEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  countryGridLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4a5568",
  },
  bankSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bankGridBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bankGridBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  bankGridLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4a5568",
  },
  primaryBtnWrapper: {
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  
  flatCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    padding: 20,
  },
  inputCardLabel: {
    fontSize: 11,
    color: "#9aa3b5",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: "900",
    color: "#10B981",
  },
  largeAmountInput: {
    fontSize: 36,
    fontWeight: "900",
    color: "#2d3748",
    width: 160,
    textAlign: "center",
  },
  calcInsetCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    width: "100%",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  labelCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  calcLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#718096",
  },
  calcVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2d3748",
  },
  calcValBold: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2d3748",
  },
  calcMono: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: "#718096",
  },
  calcDivider: {
    height: 1,
    backgroundColor: "rgba(163, 177, 198, 0.1)",
    marginVertical: 8,
  },
  calcTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2d3748",
  },
  calcTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#10B981",
  },
  
  instructionText: {
    fontSize: 12,
    color: "#9aa3b5",
    fontWeight: "600",
    textAlign: "center",
  },
  fundingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  fundingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  fundingName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2d3748",
  },
  fundingProvider: {
    fontSize: 10,
    color: "#9aa3b5",
    fontWeight: "600",
    marginTop: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
  },
  reviewFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  reviewCol: {
    flex: 1,
    alignItems: "center",
  },
  reviewCap: {
    fontSize: 9,
    color: "#9aa3b5",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  reviewAmt: {
    fontSize: 16,
    fontWeight: "900",
    color: "#2d3748",
    marginTop: 4,
  },
  reviewSub: {
    fontSize: 9,
    color: "#9aa3b5",
    fontWeight: "700",
    marginTop: 2,
  },
  flowArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(163, 177, 198, 0.1)",
    marginVertical: 16,
  },
  
  successContainer: {
    alignItems: "center",
    paddingTop: 20,
    gap: 20,
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2d3748",
  },
  successSubtitle: {
    fontSize: 12,
    color: "#9aa3b5",
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
    marginTop: -8,
  },
  shareBtn: {
    backgroundColor: "#ffffff",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shareBtnText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "800",
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
  calcWeb3Header: {
    fontSize: 9,
    fontWeight: "900",
    color: "#10B981",
    letterSpacing: 0.8,
  },
  calcHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  calcHash: {
    fontSize: 12,
    color: "#2d3748",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  successStatusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.15)",
  },
  successStatusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#10B981",
  },
});