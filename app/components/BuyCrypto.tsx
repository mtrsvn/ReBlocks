import React, { useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '../context';
import { ArrowLeft, CheckCircle2, ChevronDown, CreditCard, ChevronRight, Menu, Info, ShieldCheck, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BuyCryptoMockProps {
  onBack: () => void;
  onPaymentSuccess?: (txHash: string, finalAmount: number) => void;
}

export function BuyCryptoMock({ onBack, onPaymentSuccess }: BuyCryptoMockProps) {
  const theme = useTheme();
  
  // 1=Order, 2=Methods, 3=Card, 4=Billing, 5=Confirm, 6=Status
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('');
  
  const [amountStr, setAmountStr] = useState('100');
  const amount = parseFloat(amountStr) || 0;
  
  // Mock rate and calculation
  const exchangeRate = 1.003613; 
  const receiveAmount = amount * exchangeRate;
  
  const [mockOrderId] = useState(Math.floor(100000000000 + Math.random() * 900000000000).toString());
  const [mockTxId] = useState("0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''));

  // Status state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNext = () => {
    if (step === 1 && amount > 0) setStep(2);
    else if (step === 2 && selectedMethod) {
      if (selectedMethod === 'card') setStep(3);
      else setStep(5);
    }
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
    else if (step === 5) {
      setStep(6);
      startProcessing();
    }
  };

  const handleBack = () => {
    if (step === 1) onBack();
    else if (step === 6) {
      if (isSuccess && onPaymentSuccess) {
        onPaymentSuccess(mockTxId, receiveAmount);
      } else {
        onBack();
      }
    }
    else if (step === 5 && selectedMethod !== 'card') setStep(2);
    else setStep(step - 1);
  };

  const startProcessing = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2500);
  };

  const renderHeader = (title: string, showBack = true) => (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
      ) : <View style={styles.backBtn} />}
      <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
      <View style={styles.backBtn} />
    </View>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      
      {step === 1 && (
        <View style={styles.container}>
          {renderHeader("Buy Crypto", true)}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Pay</Text>
                  <TextInput
                    style={[styles.inputValue, { color: theme.text }]}
                    value={amountStr}
                    onChangeText={setAmountStr}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.icon}
                  />
                </View>
                <View style={[styles.currencyPill, { backgroundColor: theme.background }]}>
                  <View style={[styles.pillIcon, { backgroundColor: '#2563EB' }]}><Text style={styles.pillIconText}>$</Text></View>
                  <Text style={[styles.pillText, { color: theme.text }]}>USD</Text>
                  <ChevronDown size={16} color={theme.icon} />
                </View>
              </View>
            </View>

            <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.surface, marginTop: 16 }]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Receive (estimate)</Text>
                  <Text style={[styles.inputValue, { color: theme.text }]}>{receiveAmount.toFixed(4)}</Text>
                </View>
                <View style={[styles.currencyPill, { backgroundColor: theme.background }]}>
                  <View style={[styles.pillIcon, { backgroundColor: '#2775CA' }]}><Text style={styles.pillIconText}>C</Text></View>
                  <Text style={[styles.pillText, { color: theme.text }]}>USDC</Text>
                  <ChevronDown size={16} color={theme.icon} />
                </View>
              </View>
            </View>

            <View style={[styles.summaryBox, { backgroundColor: theme.surface }]}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                You will get <Text style={{fontWeight: '700', color: theme.text}}>{receiveAmount.toFixed(4)} USDC</Text> for <Text style={{fontWeight: '700', color: theme.text}}>{amount.toFixed(2)} USD</Text>
              </Text>
              <View style={[styles.summaryRow, { marginTop: 16 }]}>
                <Text style={styles.summarySubLabel}>{receiveAmount.toFixed(4)} USDC (@ {(amount > 0 && receiveAmount > 0) ? (amount/receiveAmount).toFixed(4) : "-"} USD)</Text>
                <Text style={[styles.summarySubValue, { color: theme.text }]}>{amount.toFixed(2)} USD</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summarySubLabel}>Network Fee</Text>
                <Text style={[styles.summarySubValue, { color: '#10B981' }]}>Free (Morph L2)</Text>
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={amount <= 0}
              onPress={handleNext}
            >
              <LinearGradient colors={amount > 0 ? ["#10B981", "#059669"] : ["#cbd5e1", "#94a3b8"]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {step === 2 && (
        <View style={styles.container}>
          {renderHeader("Select Payment Method")}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {[
              { id: 'card', name: 'Visa / Mastercard', icon: CreditCard, color: '#2563EB', rate: '0.9844' },
              { id: 'google', name: 'Google Pay', icon: CreditCard, color: '#EA4335', rate: '0.9844' },
              { id: 'apple', name: 'Apple Pay', icon: CreditCard, color: '#000000', rate: '0.9844' },
            ].map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, { backgroundColor: theme.surface, borderColor: selectedMethod === method.id ? theme.primary : theme.border }]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <method.icon size={20} color={method.color} style={{ marginRight: 12 }} />
                    <Text style={[styles.methodName, { color: theme.text }]}>{method.name}</Text>
                  </View>
                  {method.id === 'card' && (
                    <View style={styles.addCardBadge}>
                      <Text style={styles.addCardBadgeText}>Add card</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.rowBetween, { marginTop: 12 }]}>
                  <View style={styles.instantBadge}>
                    <Text style={styles.instantBadgeText}>Instant</Text>
                  </View>
                  <Text style={[styles.methodRate, { color: theme.text }]}>@ {method.rate} USD</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={!selectedMethod}
              onPress={handleNext}
              style={{ marginTop: 'auto' }}
            >
              <LinearGradient colors={selectedMethod ? ["#10B981", "#059669"] : ["#cbd5e1", "#94a3b8"]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {step === 3 && (
        <View style={styles.container}>
          {renderHeader("Add New Card")}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>Cardholder Name</Text>
            <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="Full name on your card back" placeholderTextColor={theme.icon} />
            
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Card Number</Text>
            <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="Enter card number" placeholderTextColor={theme.icon} keyboardType="numeric" />
            
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Expire Date</Text>
                <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="MM/YY" placeholderTextColor={theme.icon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVV / CVC</Text>
                <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="CVV/CVC" placeholderTextColor={theme.icon} secureTextEntry />
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.8} onPress={handleNext} style={{ marginTop: 40 }}>
              <LinearGradient colors={["#10B981", "#059669"]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {step === 4 && (
        <View style={styles.container}>
          {renderHeader("Add New Card")}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>Country</Text>
            <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} value="Philippines" editable={false} />
            
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Address</Text>
            <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="Address" placeholderTextColor={theme.icon} />
            
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="City" placeholderTextColor={theme.icon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput style={[styles.textInput, { borderColor: theme.border, color: theme.text }]} placeholder="Postal Code" placeholderTextColor={theme.icon} />
              </View>
            </View>

            <Text style={styles.disclaimerText}>The card will be saved after payment is successful for your next convenience payment.</Text>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 40 }}>
              <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={handleNext} style={{ flex: 1 }}>
                <LinearGradient colors={["#10B981", "#059669"]} style={[styles.primaryBtn, { marginTop: 0 }]}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {step === 5 && (
        <View style={styles.container}>
          {renderHeader("Confirm Payment")}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.centerAlign}>
              <Text style={[styles.bigConfirmAmount, { color: theme.text }]}>≈{receiveAmount.toFixed(4)} <Text style={{fontSize: 16, color: '#94a3b8'}}>USDC</Text></Text>
              <Text style={styles.confirmSub}>You will receive</Text>
            </View>

            <View style={styles.networkBadge}>
              <Text style={styles.networkBadgeTitle}>Morph L2 Network</Text>
              <Text style={styles.networkBadgeAddress}>0x80054640b9872bc82e862f4037846387a31b42da</Text>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 8 }]}>Pay with</Text>
            <View style={[styles.methodCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CreditCard size={20} color={selectedMethod === 'google' ? '#EA4335' : selectedMethod === 'apple' ? '#000' : '#2563EB'} style={{ marginRight: 12 }} />
                  <Text style={[styles.methodName, { color: theme.text }]}>
                    {selectedMethod === 'card' ? '--- 5890' : selectedMethod === 'google' ? 'Google Pay' : 'Apple Pay'}
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.icon} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                <View style={styles.instantBadge}><Text style={styles.instantBadgeText}>Instant</Text></View>
                <Text style={styles.gatewayFee}>Gateway Fee: 0%</Text>
              </View>
            </View>

            <View style={[styles.totalRow, { backgroundColor: theme.surface }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total to pay</Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>{amount.toFixed(2)} USD</Text>
            </View>

            <TouchableOpacity activeOpacity={0.8} onPress={handleNext} style={{ marginTop: 24 }}>
              <LinearGradient colors={["#10B981", "#059669"]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Confirm Payment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {step === 6 && (
        <View style={styles.container}>
          {renderHeader("Payment Status", false)}
          
          {isProcessing ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.text} />
              <Text style={[styles.processingText, { color: theme.text }]}>Processing Payment...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={64} color="#4ade80" />
              </View>
                <Text style={[styles.successTitle, { color: theme.text }]}>Payment Successful</Text>
                <Text style={[styles.successAmount, { color: theme.text }]}>{receiveAmount.toFixed(4)} <Text style={{fontSize: 16, color: '#94a3b8'}}>USDC</Text></Text>

                <View style={[styles.receiptBox, { borderColor: theme.border }]}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Order Time</Text>
                    <Text style={[styles.receiptValue, { color: theme.text }]}>{new Date().toLocaleString()}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Order ID</Text>
                    <Text style={[styles.receiptValue, { color: theme.text }]}>{mockOrderId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Pay Amount</Text>
                    <Text style={[styles.receiptValue, { color: theme.text }]}>{amount.toFixed(2)} USD</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Network</Text>
                    <Text style={[styles.receiptValue, { color: theme.text }]}>Morph L2</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>To Address</Text>
                    <Text style={[styles.receiptValue, { color: theme.text }]} numberOfLines={1}>0x80054640b987...b42da</Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.receiptLabel}>Transaction ID</Text>
                    <Text style={[styles.receiptValue, { color: theme.text }]} numberOfLines={1}>{mockTxId.substring(0, 16)}...</Text>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={{ width: '100%', marginTop: 32 }}>
                  <LinearGradient colors={["#10B981", "#059669"]} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20 },
  
  // Step 1
  inputBox: { borderWidth: 1, borderRadius: 16, padding: 20 },
  inputLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 12, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputValue: { fontSize: 24, fontWeight: '700', flex: 1 },
  currencyPill: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 20, paddingRight: 10 },
  pillIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  pillIconText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pillText: { fontSize: 14, fontWeight: '600', marginRight: 4, transform: [{translateY: -1}] },
  
  summaryBox: { padding: 16, borderRadius: 12, marginTop: 24, marginBottom: 24 },
  summaryLabel: { fontSize: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summarySubLabel: { fontSize: 13, color: '#94a3b8' },
  summarySubValue: { fontSize: 13, fontWeight: '600' },
  
  primaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  
  // Step 2
  methodCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  methodName: { fontSize: 15, fontWeight: '600' },
  addCardBadge: { backgroundColor: '#a3e635', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  addCardBadgeText: { fontSize: 10, fontWeight: '700', color: '#000' },
  instantBadge: { backgroundColor: 'rgba(74, 222, 128, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  instantBadgeText: { fontSize: 10, color: '#4ade80', fontWeight: '600' },
  methodRate: { fontSize: 12, fontWeight: '600' },
  
  // Step 3 & 4
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 52, marginTop: 8, fontSize: 15 },
  disclaimerText: { fontSize: 11, color: '#94a3b8', marginTop: 16, lineHeight: 16 },
  secondaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },
  
  // Step 5
  centerAlign: { alignItems: 'center', marginTop: 20 },
  bigConfirmAmount: { fontSize: 40, fontWeight: '800' },
  confirmSub: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
  networkBadge: { backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  networkBadgeTitle: { color: '#4ade80', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  networkBadgeAddress: { color: '#94a3b8', fontSize: 11 },
  gatewayFee: { fontSize: 12, color: '#94a3b8' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderRadius: 12, marginTop: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 16, fontWeight: '700' },
  
  // Step 6
  processingText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  successIconWrapper: { marginTop: 40, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successAmount: { fontSize: 32, fontWeight: '800', marginBottom: 40 },
  receiptBox: { width: '100%', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
  receiptLabel: { fontSize: 13, color: '#94a3b8' },
  receiptValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', paddingLeft: 16 },
});
