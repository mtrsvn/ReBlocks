import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  ArrowLeft,
  Send,
  Bot,
  CheckCircle,
  X,
  RotateCcw,
  Mic,
  ArrowUp,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedButton } from "./AnimatedButton";
import { Recipient, useApp, useTheme } from "../context";
import { getCountryFlag } from "../utils/countries";



interface TxnData {
  recipient: string;
  username: string;
  amount: number;
  currency: string;
  symbol: string;
  fee: number;
  total: number;
  flag: string;
  country: string;
}

interface UserMsg {
  id: string;
  role: "user";
  text: string;
}

interface AITextMsg {
  id: string;
  role: "ai";
  type: "text";
  text: string;
}

interface AIConfirmMsg {
  id: string;
  role: "ai";
  type: "confirmation";
  txn: TxnData;
  status: "pending" | "processing" | "completed" | "cancelled";
  txnId?: string;
}

interface AIWeb3ConfirmMsg {
  id: string;
  role: "ai";
  type: "web3_confirmation";
  action: string;
  amount: number;
  network: string;
  gasFee: string;
  status: "pending" | "signing" | "completed" | "cancelled";
  txHash?: string;
}

type ChatMessage = UserMsg | AITextMsg | AIConfirmMsg | AIWeb3ConfirmMsg;



const CHIPS = [
  "Send money",
  "Exchange rates",
  "Recent transfers",
  "Check Gas Fee",
  "USDC Balance",
  "Recent TxHash",
];



function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function detectCurrency(text: string): { symbol: string; currency: string } {
  if (/usdt|₮/i.test(text)) return { symbol: "₮", currency: "USDT" };
  if (/\$|usd(?!t)/i.test(text)) return { symbol: "$", currency: "USD" };
  if (/€|eur/i.test(text)) return { symbol: "€", currency: "EUR" };
  return { symbol: "₱", currency: "PHP" };
}

function lookupContact(name: string) {
  const cleaned = name.replace(/^@/, "").toLowerCase().trim();
  if (CONTACTS[cleaned]) return CONTACTS[cleaned];
  for (const k of Object.keys(CONTACTS)) {
    if (cleaned.includes(k) || k.includes(cleaned)) return CONTACTS[k];
  }
  return null;
}

function calcFee(amount: number, currency: string) {
  if (currency === "PHP") return parseFloat(Math.max(5, amount * 0.005).toFixed(2));
  return parseFloat(Math.max(0.1, amount * 0.005).toFixed(4));
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9@\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeUsername(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `@${cleaned.slice(0, 18) || "recipient"}`;
}

function recipientToTxn(recipient: Recipient, amount: number, currency: string, symbol: string, fee: number): TxnData {
  return {
    recipient: recipient.name,
    username: makeUsername(recipient.name),
    amount,
    currency,
    symbol,
    fee,
    total: parseFloat((amount + fee).toFixed(2)),
    flag: getCountryFlag(recipient.countryCode),
    country: recipient.countryCode.toUpperCase(),
  };
}

function findRecipientFromDatabase(query: string, recipients: Recipient[]) {
  const cleaned = normalizeQuery(query);
  if (!cleaned) return null;

  const exact = recipients.find((recipient) => {
    const name = normalizeQuery(recipient.name);
    const bank = normalizeQuery(recipient.bankName);
    const account = normalizeQuery(recipient.accountNumber || "");
    const country = normalizeQuery(recipient.countryCode);
    return cleaned === name || cleaned === bank || cleaned === account || cleaned === country;
  });
  if (exact) return exact;

  return recipients.find((recipient) => {
    const name = normalizeQuery(recipient.name);
    const bank = normalizeQuery(recipient.bankName);
    const account = normalizeQuery(recipient.accountNumber || "");
    const country = normalizeQuery(recipient.countryCode);
    return (
      name.includes(cleaned) ||
      cleaned.includes(name) ||
      bank.includes(cleaned) ||
      cleaned.includes(bank) ||
      account.includes(cleaned) ||
      cleaned.includes(account) ||
      country.includes(cleaned)
    );
  }) || null;
}

type Intent =
  | { type: "send"; recipient: string; amount: number; symbol: string; currency: string }
  | { type: "balance" }
  | { type: "recent" }
  | { type: "send_prompt" }
  | { type: "rates" }
  | { type: "gas_fee" }
  | { type: "usdc_balance" }
  | { type: "recent_txhash" }
  | { type: "web3_send"; recipient: string; amount: number }
  | { type: "help" };

function parseIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();

  
  if (/(?:check|show|get|what'?s?).*gas.*fee/i.test(lower)) return { type: "gas_fee" };
  if (/usdc.*balance|balance.*usdc/i.test(lower)) return { type: "usdc_balance" };
  if (/(?:recent|last|show).*(?:txhash|tx hash|transaction hash)/i.test(lower)) return { type: "recent_txhash" };

  
  const web3SendRe = /(?:send|transfer)\s+(\d[\d,._]*)\s*usdc\s+(?:to\s+)?(0x[a-fA-F0-9]{40}|.+)/i;
  const w3m = text.match(web3SendRe);
  if (w3m) {
    const amount = parseFloat(w3m[1].replace(/[,_]/g, ""));
    const recipient = w3m[2].trim();
    return { type: "web3_send", recipient, amount };
  }

  if (/^send\s*money$/i.test(lower) || /^send$/i.test(lower)) return { type: "send_prompt" };
  if (/^check\s*balance$/i.test(lower) || /^balance$/i.test(lower)) return { type: "balance" };
  if (/^recent\s*recipients?$/i.test(lower) || /^recent\s*transfers?$/i.test(lower)) return { type: "recent" };
  if (/^exchange\s*rates?$/i.test(lower)) return { type: "rates" };

  const sendRe = /(?:send|transfer|pay)\s+([₱₮$€]?)(\d[\d,._]*)\s*(?:usdt|usd(?!t)|eur|php)?\s+(?:to\s+)?(.+)/i;
  const m = text.match(sendRe);
  if (m) {
    const cur = detectCurrency(m[1] + " " + text);
    const amount = parseFloat(m[2].replace(/[,_]/g, ""));
    return { type: "send", recipient: m[3].trim(), amount, ...cur };
  }

  if (/balance|how much|wallet amount/i.test(lower)) return { type: "balance" };
  if (/rate|exchange|fx|convert/i.test(lower)) return { type: "rates" };
  if (/recent|last.*(?:send|transfer)|recipient|contact/i.test(lower)) return { type: "recent" };
  if (/send|transfer|pay/i.test(lower)) return { type: "send_prompt" };

  return { type: "help" };
}



function FormattedText({ text }: { text: string }) {
  const theme = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={i} style={{ color: theme.text, fontWeight: "800" }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

function ConfirmationCard({
  message,
  onConfirm,
  onCancel,
  onSendAgain,
}: {
  message: AIConfirmMsg;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onSendAgain: (txn: TxnData) => void;
}) {
  const { txn, status, txnId } = message;
  const theme = useTheme();
  return (
    <View style={styles.botContainer}>
      <View style={styles.botAvatar}>
        <Bot size={13} color="white" />
      </View>
      <View style={[styles.confirmCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <Text style={styles.cardHeaderTitle}>CONFIRM TRANSFER</Text>
        </View>

        <View style={styles.cardContent}>
          
          <View style={styles.recipientRow}>
            <View style={[styles.flagBadge, { backgroundColor: theme.background }]}>
              <Text style={{ fontSize: 20 }}>{txn.flag}</Text>
            </View>
            <View>
              <Text style={[styles.recipientName, { color: theme.text }]}>{txn.recipient}</Text>
              <Text style={[styles.recipientSub, { color: theme.textSecondary }]}>
                {txn.username} · {txn.country}
              </Text>
            </View>
          </View>

          
          <View style={[styles.amountInset, { backgroundColor: theme.background }]}>
            <Text style={[styles.amountInsetLabel, { color: theme.textSecondary }]}>YOU SEND</Text>
            <Text style={[styles.amountInsetVal, { color: theme.text }]}>
              {txn.symbol}{" "}
              {txn.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={[styles.amountInsetCurrency, { color: theme.textSecondary }]}>{txn.currency}</Text>
          </View>

          
          <View style={{ gap: 6, marginBottom: 16 }}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Amount</Text>
              <Text style={[styles.breakdownVal, { color: theme.text }]}>
                {txn.symbol} {txn.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Network Fee</Text>
              <Text style={[styles.breakdownVal, { color: theme.text }]}>
                {txn.symbol} {txn.fee.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
              <Text style={styles.totalVal}>
                {txn.symbol}{" "}
                {txn.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>

          
          {status === "pending" && (
            <View style={styles.actionRow}>
              <AnimatedButton
                onPress={() => onCancel(message.id)}
                style={[styles.cancelBtn, { backgroundColor: theme.background }]}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </AnimatedButton>
              <AnimatedButton
                onPress={() => onConfirm(message.id)}
                style={styles.confirmBtnWrapper}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </LinearGradient>
              </AnimatedButton>
            </View>
          )}

          {status === "processing" && (
            <View style={[styles.loadingWrapper, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Sending via wallet transfer…</Text>
            </View>
          )}

          {status === "completed" && (
            <View style={[styles.successWrapper, { backgroundColor: theme.background }]}>
              <CheckCircle size={24} color="#48bb78" />
              <Text style={[styles.successText, { color: theme.text }]}>Transaction Completed!</Text>
              <Text style={[styles.txnIdText, { color: theme.textSecondary }]}>ID: {txnId}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSendAgain(txn)}
                style={[styles.againBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <RotateCcw size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.againText}>Send Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "cancelled" && (
            <View style={[styles.loadingWrapper, { backgroundColor: theme.background }]}>
              <X size={14} color="#ef4444" />
              <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: "600" }}>
                Cancelled
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Web3ConfirmationCard({
  message,
  onConfirm,
  onCancel,
}: {
  message: AIWeb3ConfirmMsg;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const { action, network, gasFee, status, txHash } = message;
  const theme = useTheme();
  return (
    <View style={styles.botContainer}>
      <View style={styles.botAvatar}>
        <Bot size={13} color="white" />
      </View>
      <View style={[styles.confirmCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <Text style={styles.cardHeaderTitle}>SMART CONTRACT ACTION</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={{ gap: 8, marginBottom: 16 }}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Action</Text>
              <Text style={[styles.web3Val, { color: theme.text }]}>{action}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Network</Text>
              <Text style={[styles.web3Val, { color: "#10B981" }]}>{network}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Gas Fee</Text>
              <Text style={[styles.web3Val, { color: "#48bb78" }]}>{gasFee}</Text>
            </View>
          </View>

          {status === "pending" && (
            <View style={styles.actionRow}>
              <AnimatedButton
                onPress={() => onCancel(message.id)}
                style={[styles.cancelBtn, { backgroundColor: theme.background }]}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Reject</Text>
              </AnimatedButton>
              <AnimatedButton
                onPress={() => onConfirm(message.id)}
                style={styles.confirmBtnWrapper}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmText}>Sign Transaction</Text>
                </LinearGradient>
              </AnimatedButton>
            </View>
          )}

          {status === "signing" && (
            <View style={[styles.loadingWrapper, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="small" color="#48bb78" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Broadcasting to Morph L2...</Text>
            </View>
          )}

          {status === "completed" && (
            <View style={[styles.successWrapper, { backgroundColor: theme.background }]}>
              <CheckCircle size={24} color="#48bb78" />
              <Text style={[styles.successText, { color: theme.text }]}>Transaction Confirmed!</Text>
              <Text style={[styles.txnIdText, { color: theme.textSecondary }]}>TxHash: {txHash}</Text>
            </View>
          )}

          {status === "cancelled" && (
            <View style={[styles.loadingWrapper, { backgroundColor: theme.background }]}>
              <X size={14} color="#ef4444" />
              <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: "600" }}>
                Transaction Rejected
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
  onSendAgain,
}: {
  message: ChatMessage;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onSendAgain: (txn: TxnData) => void;
}) {
  const theme = useTheme();

  if (message.role === "user") {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  if (message.type === "confirmation") {
    return (
      <ConfirmationCard
        message={message}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onSendAgain={onSendAgain}
      />
    );
  }

  if (message.type === "web3_confirmation") {
    return (
      <Web3ConfirmationCard
        message={message}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <View style={styles.botContainer}>
      <View style={styles.botAvatar}>
        <Bot size={13} color="white" />
      </View>
      <View style={[styles.botBubble, { backgroundColor: theme.surface }]}>
        <FormattedText text={message.text} />
      </View>
    </View>
  );
}



interface AIChatScreenProps {
  onBack: () => void;
  onStartSend?: (recipient: Recipient, amount?: number, currency?: string) => void;
  onStartAddContact?: (name: string) => void;
}

export function AIChatScreen({ onBack, onStartSend, onStartAddContact }: AIChatScreenProps) {
  const { recipients } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "ai",
      type: "text",
      text: "Hi, Carlos! 👋 I'm your **AI Wallet Assistant**.\n\nJust tell me what you need — try something like:\n\"Send ₱1000 to Maria\" or \"Show exchange rates\"",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const theme = useTheme();

  const autoScroll = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  useEffect(() => {
    autoScroll();
  }, [messages, isTyping]);

  const addAIMsg = (payload: any) => {
    const msg = { ...payload, id: uid() } as ChatMessage;
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  };

  const processAndRespond = async (text: string) => {
    const intent = parseIntent(text);
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsTyping(false);

    if (intent.type === "send") {
      const contact = findRecipientFromDatabase(intent.recipient, recipients);
      if (!contact) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: `I couldn't find **"${intent.recipient}"** in your saved recipients.\n\nOpening add contact so you can save it now.`,
        });
        if (onStartAddContact) {
          onStartAddContact(intent.recipient);
        }
        return;
      }
      if (!intent.amount || intent.amount <= 0) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: `Got it — I found **${contact.name}** in your saved recipients. How much would you like to send? E.g. \"Send ₱500 to ${contact.name}\"`,
        });
        return;
      }
      if (onStartSend) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: `Opening send flow for **${contact.name}** with **${intent.symbol}${intent.amount.toLocaleString()}**.`,
        });
        onStartSend(contact, intent.amount, intent.currency);
        return;
      }
      const fee = calcFee(intent.amount, intent.currency);
      addAIMsg({
        role: "ai",
        type: "confirmation",
        txn: recipientToTxn(contact, intent.amount, intent.currency, intent.symbol, fee),
        status: "pending",
      });
    } else if (intent.type === "balance") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "💰 **Your current balances:**\n\n• ₱ 128,663.55 PHP\n• ₮ 2,241.50 USDT\n• $ 2,241.50 USD\n\nYour wallet is looking great! 🟢",
      });
    } else if (intent.type === "recent") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "Here are your **recent recipients:**\n\n🇯🇵 Maria Santos @mariasantos — ₮15.00 · Today\n🇺🇸 Juan dela Cruz @juandc — ₮50.00 · Today\n🇬🇧 Ana Reyes @anareyes — ₮100.00 · Yesterday\n\nWant to send to any of them?",
      });
    } else if (intent.type === "rates") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "💱 **Live Exchange Rates (to PHP):**\n\n🇺🇸 USD → ₱56.20\n🇪🇺 EUR → ₱60.45\n🇬🇧 GBP → ₱71.12\n🇯🇵 JPY → ₱0.38\n🇸🇬 SGD → ₱42.50\n🇦🇺 AUD → ₱37.82\n\nGreat rates today! 📈",
      });
    } else if (intent.type === "send_prompt") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "Sure! Tell me who to send to and how much.\n\nExamples:\n• \"Send ₱1000 to Maria\"\n• \"Send 50 USDT to Juan\"\n• \"Transfer ₱500 to @anareyes\"",
      });
    } else if (intent.type === "gas_fee") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "⛽ **Current Gas Fees on Morph L2:**\n\n• Standard: **$0.001** (~1-2 min)\n• Fast: **$0.002** (~30 sec)\n• Instant: **$0.003** (~10 sec)\n\nMorph L2 is optimized for low-cost transactions! 🚀",
      });
    } else if (intent.type === "usdc_balance") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "💵 **Your USDC Balance:**\n\n• **2,241.50 USDC** (Morph L2)\n• **~₱126,173** at current rates\n\nYour stablecoin wallet is ready to use! ✨",
      });
    } else if (intent.type === "recent_txhash") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "📋 **Recent Transaction Hashes:**\n\n• **0x71C7...3aF** — Send 50 USDC (Success)\n• **0xA4B2...8D1** — Receive 100 USDC (Success)\n• **0x9F3E...C2A** — Send 25 USDC (Success)\n\nAll transactions confirmed on Morph L2! ✅",
      });
    } else if (intent.type === "web3_send") {
      addAIMsg({
        role: "ai",
        type: "text",
        text: `🔗 **Blockchain Transfer Initiated**\n\nAction: Send **${intent.amount} USDC**\nTo: \`${intent.recipient.slice(0, 6)}...${intent.recipient.slice(-4)}\`\nNetwork: **Morph L2**\nEstimated Gas: **$0.001**\n\nPlease confirm this transaction in your wallet.`,
      });
    } else {
      addAIMsg({
        role: "ai",
        type: "text",
        text: "I can help you with:\n\n• **Send money** — \"Send ₱500 to Juan\"\n• **Exchange rates** — \"Show USD to PHP rate\"\n• **Recent transfers** — \"Show recent recipients\"\n• **Gas fees** — \"Check gas fee\"\n• **USDC balance** — \"Show USDC balance\"\n\nWhat would you like to do?",
      });
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text || isTyping) return;
    setInputText("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", text } as UserMsg]);
    await processAndRespond(text);
  };

  const handleConfirm = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === "ai" && m.type === "confirmation"
          ? { ...m, status: "processing" }
          : m
      )
    );
    setTimeout(() => {
      const txnId = "TXN-" + Math.random().toString(16).slice(2, 10).toUpperCase();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.role === "ai" && m.type === "confirmation"
            ? { ...m, status: "completed", txnId }
            : m
        )
      );
    }, 2200);
  };

  const handleCancel = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === "ai" && m.type === "confirmation"
          ? { ...m, status: "cancelled" }
          : m
      )
    );
    setTimeout(async () => {
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 700));
      setIsTyping(false);
      addAIMsg({
        role: "ai",
        type: "text",
        text: "Transaction cancelled. No worries — let me know if you need anything else! 😊",
      });
    }, 300);
  };

  const handleSendAgain = (txn: TxnData) => {
    const text = `Send ${txn.symbol}${txn.amount} to ${txn.recipient.split("(")[0].trim()}`;
    setInputText(text);
  };

  const handleVoicePress = () => {
    setInputText("");
    const phrase = "Send ₱500 to Juan dela Cruz";
    let index = 0;
    const interval = setInterval(() => {
      if (index < phrase.length) {
        setInputText((prev) => prev + phrase.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 40);
  };

  const canSend = inputText.trim().length > 0 && !isTyping;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 48 : 0}
      style={styles.keyboardContainer}
    >
      <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>

        
        <View style={[styles.header, { borderColor: theme.border }]}>
          <AnimatedButton
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: theme.surface }]}
          >
            <ArrowLeft size={17} color={theme.icon} />
          </AnimatedButton>
          <View style={styles.headerTitleRow}>
            <View style={styles.botAvatar}>
              <Bot size={17} color="white" />
            </View>
            <Text style={[styles.headerTitleText, { color: theme.text }]}>AI Wallet Assistant</Text>
          </View>
        </View>

        
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onSendAgain={handleSendAgain}
            />
          ))}

          {isTyping && (
            <View style={styles.botContainer}>
              <View style={styles.botAvatar}>
                <Bot size={13} color="white" />
              </View>
              <View style={[styles.typingDotsCard, { backgroundColor: theme.surface }]}>
                <ActivityIndicator size="small" color="#9aa3b5" />
              </View>
            </View>
          )}

          
          {messages.length <= 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {CHIPS.map((chip) => (
                <AnimatedButton
                  key={chip}
                  onPress={() => handleSend(chip)}
                  style={[styles.chipBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text style={[styles.chipBtnText, { color: theme.textSecondary }]}>{chip}</Text>
                </AnimatedButton>
              ))}
            </ScrollView>
          )}

        </ScrollView>

        
        <SafeAreaView style={{ backgroundColor: theme.background }}>
          <View style={[styles.inputBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={[styles.insetInputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                placeholder='Try "Send ₱1000 to Maria"'
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
            <AnimatedButton
              onPress={inputText.trim().length > 0 ? () => handleSend() : handleVoicePress}
              style={styles.sendBtnWrapper}
            >
              {inputText.trim().length > 0 ? (
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.sendBtnActive}
                >
                  <ArrowUp size={18} color="#ffffff" />
                </LinearGradient>
              ) : (
                <View style={[styles.sendBtn, { backgroundColor: theme.surface }]}>
                  <Mic size={18} color={theme.icon} />
                </View>
              )}
            </AnimatedButton>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
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
    width: 36,
    height: 36,
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2d3748",
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  userContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  userText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  botContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  botBubble: {
    maxWidth: "82%",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  
  confirmCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeaderTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9aa3b5",
    letterSpacing: 0.8,
  },
  cardContent: {
    padding: 16,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  flagBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
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
  amountInset: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  amountInsetLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9aa3b5",
    letterSpacing: 0.6,
  },
  amountInsetVal: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2d3748",
    marginTop: 2,
  },
  amountInsetCurrency: {
    fontSize: 10,
    color: "#9aa3b5",
    fontWeight: "700",
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#9aa3b5",
    fontWeight: "600",
  },
  breakdownVal: {
    fontSize: 12,
    color: "#4a5568",
    fontWeight: "700",
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2d3748",
  },
  totalVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2d3748",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmBtnWrapper: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    flexDirection: "row",
  },
  loadingText: {
    fontSize: 11,
    color: "#9aa3b5",
    fontWeight: "600",
  },
  successWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  successText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#48bb78",
  },
  txnIdText: {
    fontSize: 10,
    color: "#b0b8c8",
    fontWeight: "600",
  },
  againBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  againText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
  },
  web3Val: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2d3748",
  },
  typingDotsCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipsScroll: {
    marginTop: 10,
    flexGrow: 0,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 16,
  },
  chipBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipBtnText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  insetInputContainer: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 13 : 8,
  },
  textInput: {
    fontSize: 15,
    color: "#2d3748",
    fontWeight: "500",
  },
  sendBtnWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  sendBtn: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
