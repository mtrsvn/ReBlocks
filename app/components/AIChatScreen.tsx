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
  Keyboard,
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

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Mock Data ─────────────────────────────────────────────────────────────────

const CONTACTS: Record<string, Pick<TxnData, "recipient" | "username" | "flag" | "country">> = {
  maria: { recipient: "Maria Mendoza", username: "@mariamendoza", flag: "🇵🇭", country: "PH" },
  mariamendoza: { recipient: "Maria Mendoza", username: "@mariamendoza", flag: "🇵🇭", country: "PH" },
  mariasantos: { recipient: "Maria Santos", username: "@mariasantos", flag: "🇯🇵", country: "JP" },
  juan: { recipient: "Juan dela Cruz", username: "@juandc", flag: "🇺🇸", country: "US" },
  juandc: { recipient: "Juan dela Cruz", username: "@juandc", flag: "🇺🇸", country: "US" },
  ana: { recipient: "Ana Reyes", username: "@anareyes", flag: "🇬🇧", country: "GB" },
  anareyes: { recipient: "Ana Reyes", username: "@anareyes", flag: "🇬🇧", country: "GB" },
  pedro: { recipient: "Pedro Lim", username: "@pedrolim", flag: "🇸🇬", country: "SG" },
  pedrolim: { recipient: "Pedro Lim", username: "@pedrolim", flag: "🇸🇬", country: "SG" },
};

const CHIPS = [
  "Send money",
  "Exchange rates",
  "Recent transfers",
  "Check Gas Fee",
  "USDC Balance",
  "Recent TxHash",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  // Web3-specific commands
  if (/(?:check|show|get|what'?s?).*gas.*fee/i.test(lower)) return { type: "gas_fee" };
  if (/usdc.*balance|balance.*usdc/i.test(lower)) return { type: "usdc_balance" };
  if (/(?:recent|last|show).*(?:txhash|tx hash|transaction hash)/i.test(lower)) return { type: "recent_txhash" };

  // Web3 send pattern
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

// ── Sub-components ────────────────────────────────────────────────────────────

function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ color: "#4a5568", fontSize: 13, lineHeight: 18 }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={i} style={{ color: "#2d3748", fontWeight: "800" }}>
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
  return (
    <View style={styles.botContainer}>
      <View style={styles.botAvatar}>
        <Bot size={13} color="white" />
      </View>
      <View style={styles.confirmCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>CONFIRM TRANSFER</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Recipient info */}
          <View style={styles.recipientRow}>
            <View style={styles.flagBadge}>
              <Text style={{ fontSize: 20 }}>{txn.flag}</Text>
            </View>
            <View>
              <Text style={styles.recipientName}>{txn.recipient}</Text>
              <Text style={styles.recipientSub}>
                {txn.username} · {txn.country}
              </Text>
            </View>
          </View>

          {/* Amount Inset Box */}
          <View style={styles.amountInset}>
            <Text style={styles.amountInsetLabel}>YOU SEND</Text>
            <Text style={styles.amountInsetVal}>
              {txn.symbol}{" "}
              {txn.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.amountInsetCurrency}>{txn.currency}</Text>
          </View>

          {/* Fee breakdown */}
          <View style={{ gap: 6, marginBottom: 16 }}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Amount</Text>
              <Text style={styles.breakdownVal}>
                {txn.symbol} {txn.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Network Fee</Text>
              <Text style={styles.breakdownVal}>
                {txn.symbol} {txn.fee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>
                {txn.symbol}{" "}
                {txn.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>

          {/* Action states */}
          {status === "pending" && (
            <View style={styles.actionRow}>
              <AnimatedButton
                onPress={() => onCancel(message.id)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
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
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={styles.loadingText}>Sending via wallet transfer…</Text>
            </View>
          )}

          {status === "completed" && (
            <View style={styles.successWrapper}>
              <CheckCircle size={24} color="#48bb78" />
              <Text style={styles.successText}>Transaction Completed!</Text>
              <Text style={styles.txnIdText}>ID: {txnId}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSendAgain(txn)}
                style={styles.againBtn}
              >
                <RotateCcw size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.againText}>Send Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "cancelled" && (
            <View style={styles.loadingWrapper}>
              <X size={14} color="#ef4444" />
              <Text style={{ fontSize: 12, color: "#9aa3b5", fontWeight: "600" }}>
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
  return (
    <View style={styles.botContainer}>
      <View style={styles.botAvatar}>
        <Bot size={13} color="white" />
      </View>
      <View style={styles.confirmCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>SMART CONTRACT ACTION</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={{ gap: 8, marginBottom: 16 }}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Action</Text>
              <Text style={styles.web3Val}>{action}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Network</Text>
              <Text style={[styles.web3Val, { color: "#10B981" }]}>{network}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Gas Fee</Text>
              <Text style={[styles.web3Val, { color: "#48bb78" }]}>{gasFee}</Text>
            </View>
          </View>

          {status === "pending" && (
            <View style={styles.actionRow}>
              <AnimatedButton
                onPress={() => onCancel(message.id)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Reject</Text>
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
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="small" color="#48bb78" />
              <Text style={styles.loadingText}>Broadcasting to Morph L2...</Text>
            </View>
          )}

          {status === "completed" && (
            <View style={styles.successWrapper}>
              <CheckCircle size={24} color="#48bb78" />
              <Text style={styles.successText}>Transaction Confirmed!</Text>
              <Text style={styles.txnIdText}>TxHash: {txHash}</Text>
            </View>
          )}

          {status === "cancelled" && (
            <View style={styles.loadingWrapper}>
              <X size={14} color="#ef4444" />
              <Text style={{ fontSize: 12, color: "#9aa3b5", fontWeight: "600" }}>
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
      <View style={styles.botBubble}>
        <FormattedText text={message.text} />
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface AIChatScreenProps {
  onBack: () => void;
}

export function AIChatScreen({ onBack }: AIChatScreenProps) {
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

  const autoScroll = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      const contact = lookupContact(intent.recipient);
      if (!contact) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: `I couldn't find **"${intent.recipient}"** in your contacts.\n\nTry searching by @username or check your beneficiaries list.`,
        });
        return;
      }
      if (!intent.amount || intent.amount <= 0) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: `Got it — sending to **${contact.recipient}**. How much would you like to send? E.g. \"Send ₱500 to ${intent.recipient}\"`,
        });
        return;
      }
      const fee = calcFee(intent.amount, intent.currency);
      addAIMsg({
        role: "ai",
        type: "confirmation",
        txn: {
          ...contact,
          amount: intent.amount,
          currency: intent.currency,
          symbol: intent.symbol,
          fee,
          total: parseFloat((intent.amount + fee).toFixed(2)),
        },
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
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedButton
            onPress={onBack}
            style={styles.backBtn}
          >
            <ArrowLeft size={17} color="#4a5568" />
          </AnimatedButton>
          <View style={styles.headerTitleRow}>
            <View style={styles.botAvatar}>
              <Bot size={17} color="white" />
            </View>
            <Text style={styles.headerTitleText}>AI Wallet Assistant</Text>
          </View>
        </View>

        {/* Scrollable messages area */}
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
              <View style={styles.typingDotsCard}>
                <ActivityIndicator size="small" color="#9aa3b5" />
              </View>
            </View>
          )}

          {/* Quick-action Chips list */}
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
                style={styles.chipBtn}
              >
                <Text style={styles.chipBtnText}>{chip}</Text>
              </AnimatedButton>
            ))}
          </ScrollView>
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.insetInputContainer}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              placeholder='Try "Send ₱1000 to Maria"'
              placeholderTextColor="#9aa3b5"
              style={styles.textInput}
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
              <View style={styles.sendBtn}>
                <Mic size={18} color="#4a5568" />
              </View>
            )}
          </AnimatedButton>
        </View>
        {!keyboardVisible && (
          <View
            style={{
              height: Platform.OS === "ios" ? 28 : 12,
              backgroundColor: "#ffffff",
            }}
          />
        )}
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
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
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
    fontSize: 15,
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
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Confirmation card styling
  confirmCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
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
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#718096",
    fontSize: 12,
    fontWeight: "800",
  },
  confirmBtnWrapper: {
    flex: 1.5,
    height: 38,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  againText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "800",
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
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
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
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
