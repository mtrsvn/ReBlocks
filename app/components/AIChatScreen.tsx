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
  Clock,
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

interface AIRecentMsg {
  id: string;
  role: "ai";
  type: "recent";
  text: string;
}

type ChatMessage = UserMsg | AITextMsg | AIConfirmMsg | AIRecentMsg;

const CHIPS = [
  "Send money",
  "Add recipient",
  "Exchange rates",
  "Recent transfers",
];

const COUNTRIES = [
  {
    name: "Philippines",
    flag: "🇵🇭",
    currency: "PHP",
    pair: "USD/PHP",
    rate: 58.42,
    symbol: "₱",
  },
  {
    name: "Singapore",
    flag: "🇸🇬",
    currency: "SGD",
    pair: "USD/SGD",
    rate: 1.342,
    symbol: "S$",
  },
  {
    name: "Thailand",
    flag: "🇹🇭",
    currency: "THB",
    pair: "USD/THB",
    rate: 34.65,
    symbol: "฿",
  },
  {
    name: "Vietnam",
    flag: "🇻🇳",
    currency: "VND",
    pair: "USD/VND",
    rate: 25450,
    symbol: "₫",
  },
  {
    name: "Malaysia",
    flag: "🇲🇾",
    currency: "MYR",
    pair: "USD/MYR",
    rate: 4.18,
    symbol: "RM",
  },
  {
    name: "Indonesia",
    flag: "🇮🇩",
    currency: "IDR",
    pair: "USD/IDR",
    rate: 16120,
    symbol: "Rp",
  },
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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function detectCurrency(text: string): { symbol: string; currency: string } {
  if (/usdt|₮/i.test(text)) return { symbol: "₮", currency: "USDT" };
  if (/\$|usd(?!t)/i.test(text)) return { symbol: "$", currency: "USD" };
  if (/€|eur/i.test(text)) return { symbol: "€", currency: "EUR" };
  return { symbol: "₱", currency: "PHP" };
}

function calcFee(amount: number, currency: string) {
  if (currency === "PHP")
    return parseFloat(Math.max(5, amount * 0.005).toFixed(2));
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

function recipientToTxn(
  recipient: Recipient,
  amount: number,
  currency: string,
  symbol: string,
  fee: number,
): TxnData {
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
    return (
      cleaned === name ||
      cleaned === bank ||
      cleaned === account ||
      cleaned === country
    );
  });
  if (exact) return exact;

  return (
    recipients.find((recipient) => {
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
    }) || null
  );
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
            <View
              style={[styles.flagBadge, { backgroundColor: theme.background }]}
            >
              <Text style={{ fontSize: 20 }}>{txn.flag}</Text>
            </View>
            <View>
              <Text style={[styles.recipientName, { color: theme.text }]}>
                {txn.recipient}
              </Text>
              <Text
                style={[styles.recipientSub, { color: theme.textSecondary }]}
              >
                {txn.username} · {txn.country}
              </Text>
            </View>
          </View>

          <View
            style={[styles.amountInset, { backgroundColor: theme.background }]}
          >
            <Text
              style={[styles.amountInsetLabel, { color: theme.textSecondary }]}
            >
              YOU SEND
            </Text>
            <Text style={[styles.amountInsetVal, { color: theme.text }]}>
              {txn.symbol}{" "}
              {txn.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text
              style={[
                styles.amountInsetCurrency,
                { color: theme.textSecondary },
              ]}
            >
              {txn.currency}
            </Text>
          </View>

          <View style={{ gap: 6, marginBottom: 16 }}>
            <View style={styles.breakdownRow}>
              <Text
                style={[styles.breakdownLabel, { color: theme.textSecondary }]}
              >
                Amount
              </Text>
              <Text style={[styles.breakdownVal, { color: theme.text }]}>
                {txn.symbol} {txn.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text
                style={[styles.breakdownLabel, { color: theme.textSecondary }]}
              >
                Network Fee
              </Text>
              <Text style={[styles.breakdownVal, { color: theme.text }]}>
                {txn.symbol} {txn.fee.toFixed(2)}
              </Text>
            </View>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
            <View style={styles.breakdownRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>
                Total
              </Text>
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
                style={[
                  styles.cancelBtn,
                  { backgroundColor: theme.background },
                ]}
              >
                <Text
                  style={[styles.cancelText, { color: theme.textSecondary }]}
                >
                  Cancel
                </Text>
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
            <View
              style={[
                styles.loadingWrapper,
                { backgroundColor: theme.background },
              ]}
            >
              <ActivityIndicator size="small" color="#10B981" />
              <Text
                style={[styles.loadingText, { color: theme.textSecondary }]}
              >
                Sending via wallet transfer…
              </Text>
            </View>
          )}

          {status === "completed" && (
            <View
              style={[
                styles.successWrapper,
                { backgroundColor: theme.background },
              ]}
            >
              <CheckCircle size={24} color="#48bb78" />
              <Text style={[styles.successText, { color: theme.text }]}>
                Transaction Completed!
              </Text>
              <Text style={[styles.txnIdText, { color: theme.textSecondary }]}>
                ID: {txnId}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSendAgain(txn)}
                style={[
                  styles.againBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <RotateCcw
                  size={12}
                  color="#10B981"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.againText}>Send Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "cancelled" && (
            <View
              style={[
                styles.loadingWrapper,
                { backgroundColor: theme.background },
              ]}
            >
              <X size={14} color="#ef4444" />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  fontWeight: "600",
                }}
              >
                Cancelled
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
  onHistory,
}: {
  message: ChatMessage;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onSendAgain: (txn: TxnData) => void;
  onHistory?: () => void;
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

  if (message.type === "recent") {
    return (
      <View style={styles.botContainer}>
        <View style={styles.botAvatar}>
          <Bot size={13} color="white" />
        </View>
        <View style={[styles.botBubble, { backgroundColor: theme.surface }]}>
          <FormattedText text={message.text} />
          {onHistory && (
            <AnimatedButton
              onPress={onHistory}
              style={{
                marginTop: 12,
                height: 44,
                borderRadius: 14,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock size={15} color="#ffffff" style={{ marginRight: 8 }} />
                <Text
                  style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}
                >
                  Check your history
                </Text>
              </LinearGradient>
            </AnimatedButton>
          )}
        </View>
      </View>
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
  onStartSend?: (
    recipient: Recipient,
    amount?: number,
    currency?: string,
  ) => void;
  onStartAddContact?: (name: string) => void;
  onHistory?: () => void;
}

export function AIChatScreen({
  onBack,
  onStartSend,
  onStartAddContact,
  onHistory,
}: AIChatScreenProps) {
  const {
    recipients,
    transactions,
    exchangeRates,
    defaultCurrency,
    userProfile,
  } = useApp();
  const firstName = userProfile?.fullName?.split(" ")[0] || "there";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "ai",
      type: "text",
      text: `Hi, ${firstName}! 👋 I'm your **Smart Assistant**.\n\nJust tell me what you need — try something like:\n"Send ₱1000 to Maria" or "Show exchange rates"`,
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
    setIsTyping(true);

    try {
      const url = `https://reblocks.onrender.com/api/chat`;

      const systemPrompt = `You are a friendly, helpful Smart Assistant for a fintech wallet app called ReBlocks.
The user is ${firstName}.
Your job is to parse the user's message and return a JSON object containing:
- "text": Your conversational reply. Keep it friendly, use emojis, and format with markdown if helpful.
- "intent": One of: "send", "send_prompt", "balance", "recent", "rates", "add_recipient", "greeting", or "help".
- "recipient": (Optional) The name of the recipient if the intent is 'send'.
- "amount": (Optional) The amount as a number if the intent is 'send'.
- "currency": (Optional) The currency code (e.g. PHP, USD) if the intent is 'send'.
- "symbol": (Optional) The currency symbol (e.g. ₱, $) if the intent is 'send'.
- "country": (Optional) The country name if the intent is 'rates'.

Context about the user:
- Current balances: ₱ 128,663.55 PHP, ₮ 2,241.50 USDT, $ 2,241.50 USD
- Saved recipients: ${recipients.map((r: any) => r.name).join(", ")}

Respond ONLY with valid JSON.`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{ role: "user", parts: [{ text: text }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch");
      }

      const content = data.candidates[0].content.parts[0].text;
      const intent = JSON.parse(content);

      if (
        intent.text &&
        !["recent", "rates", "balance"].includes(intent.intent)
      ) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: intent.text,
        });
      }

      if (intent.intent === "greeting") {
        if (!intent.text) {
          addAIMsg({
            role: "ai",
            type: "text",
            text: `Hello, ${firstName}! 👋 I'm your Smart Assistant. How can I help you with your finances today?`,
          });
        }
      } else if (intent.intent === "send") {
        const contact = intent.recipient
          ? findRecipientFromDatabase(intent.recipient, recipients)
          : null;
        if (!contact) {
          addAIMsg({
            role: "ai",
            type: "text",
            text: `I couldn't find **"${intent.recipient || "that person"}"** in your saved recipients.\n\nOpening add contact so you can save it now.`,
          });
          if (onStartAddContact) {
            onStartAddContact(intent.recipient || "");
          }
          setIsTyping(false);
          return;
        }
        if (!intent.amount || intent.amount <= 0) {
          addAIMsg({
            role: "ai",
            type: "text",
            text: `Got it — I found **${contact.name}** in your saved recipients. How much would you like to send?`,
          });
          setIsTyping(false);
          return;
        }
        if (onStartSend) {
          addAIMsg({
            role: "ai",
            type: "text",
            text: `Opening send flow for **${contact.name}** with **${intent.symbol || ""}${intent.amount.toLocaleString()}**.`,
          });
          onStartSend(contact, intent.amount, intent.currency);
          setIsTyping(false);
          return;
        }
        const currency = intent.currency || "PHP";
        const symbol = intent.symbol || "₱";
        const fee = calcFee(intent.amount, currency);
        addAIMsg({
          role: "ai",
          type: "confirmation",
          txn: recipientToTxn(contact, intent.amount, currency, symbol, fee),
          status: "pending",
        });
      } else if (intent.intent === "balance") {
        addAIMsg({
          role: "ai",
          type: "text",
          text:
            intent.text ||
            "Checking your accounts... 🏦\n\n💰 **Your current balances:**\n\n• ₱ 128,663.55 PHP\n• ₮ 2,241.50 USDT\n• $ 2,241.50 USD\n\nYour wallet is looking great! 🟢",
        });
      } else if (intent.intent === "recent") {
        const recentTx = transactions
          .filter((t: any) => t.type === "send")
          .slice(0, 3);
        let textResponse = intent.text
          ? intent.text + "\n\n"
          : "Pulling up your history... 📋\n\n";
        if (recentTx.length === 0) {
          textResponse += "You don't have any recent transfers yet.";
        } else {
          textResponse += "Here are your **recent transfers:**\n\n";
          recentTx.forEach((tx: any) => {
            textResponse += `• ${tx.recipientName} — ${defaultCurrency === "USD" ? "$" : "₱"}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${new Date(tx.date).toLocaleDateString()}\n`;
          });
        }
        addAIMsg({
          role: "ai",
          type: "recent",
          text: textResponse,
        });
      } else if (intent.intent === "rates") {
        if (intent.country) {
          const c = COUNTRIES.find(
            (c) => c.name.toLowerCase() === intent.country?.toLowerCase(),
          );
          if (c) {
            const usdRate = exchangeRates["USD"] || 0.018;
            const curRate = exchangeRates[c.currency] || 1;
            const realRate = usdRate > 0 ? curRate / usdRate : c.rate;
            const textResponse = `${intent.text ? intent.text + "\n\n" : "Fetching the latest rates... 💱\n\n"}**Live Exchange Rate for ${c.name} (1 USD):**\n\n${c.flag} ${c.currency} → ${c.symbol}${formatFXRate(realRate)}\n\nGreat rate today! 📈`;
            addAIMsg({
              role: "ai",
              type: "text",
              text: textResponse,
            });
            setIsTyping(false);
            return;
          }
        }

        const allRates = COUNTRIES.map((c) => {
          const usdRate = exchangeRates["USD"] || 0.018;
          const curRate = exchangeRates[c.currency] || 1;
          const realRate = usdRate > 0 ? curRate / usdRate : c.rate;
          return { ...c, rate: realRate };
        });
        let textResponse = `${intent.text ? intent.text + "\n\n" : "Fetching the latest rates... 💱\n\n"}**Live Exchange Rates (1 USD):**\n\n`;
        allRates.forEach((r) => {
          textResponse += `${r.flag} ${r.currency} → ${r.symbol}${formatFXRate(r.rate)}\n`;
        });
        textResponse += "\nGreat rates today! 📈";
        addAIMsg({
          role: "ai",
          type: "text",
          text: textResponse,
        });
      } else if (intent.intent === "add_recipient") {
        if (!intent.text) {
          addAIMsg({
            role: "ai",
            type: "text",
            text: "Opening the Add Recipient page for you now... 📝",
          });
        }
        if (onStartAddContact) {
          onStartAddContact("");
        }
      } else if (intent.intent === "send_prompt") {
        if (!intent.text) {
          addAIMsg({
            role: "ai",
            type: "text",
            text: 'Sure! Tell me who to send to and how much.\n\nExamples:\n• "Send ₱1000 to Maria"\n• "Send 50 USDT to Juan"\n• "Transfer ₱500 to @anareyes"',
          });
        }
      } else if (intent.intent === "help" && !intent.text) {
        addAIMsg({
          role: "ai",
          type: "text",
          text: "I'm not quite sure what you mean. 🤔\n\nBut I'd love to help you with:\n💸 **Sending money**\n💱 **Checking exchange rates**\n🕒 **Viewing recent transfers**\n👤 **Adding a recipient**\n\nHow can I assist you today? ✨",
        });
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      addAIMsg({
        role: "ai",
        type: "text",
        text: "Sorry, I'm having trouble connecting to my brain right now. 🧠⚡ Please try again later!",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text || isTyping) return;
    setInputText("");
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text } as UserMsg,
    ]);
    await processAndRespond(text);
  };

  const handleConfirm = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === "ai" && m.type === "confirmation"
          ? { ...m, status: "processing" }
          : m,
      ),
    );
    setTimeout(() => {
      const txnId =
        "TXN-" + Math.random().toString(16).slice(2, 10).toUpperCase();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.role === "ai" && m.type === "confirmation"
            ? { ...m, status: "completed", txnId }
            : m,
        ),
      );
    }, 2200);
  };

  const handleCancel = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === "ai" && m.type === "confirmation"
          ? { ...m, status: "cancelled" }
          : m,
      ),
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

  const canSend = inputText.trim().length > 0 && !isTyping;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 48 : 0}
      style={styles.keyboardContainer}
    >
      <View
        style={[styles.mainContainer, { backgroundColor: theme.background }]}
      >
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
            <Text style={[styles.headerTitleText, { color: theme.text }]}>
              Smart Assistant
            </Text>
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
              onHistory={onHistory}
            />
          ))}

          {isTyping && (
            <View style={styles.botContainer}>
              <View style={styles.botAvatar}>
                <Bot size={13} color="white" />
              </View>
              <View
                style={[
                  styles.typingDotsCard,
                  { backgroundColor: theme.surface },
                ]}
              >
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
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipBtnText, { color: theme.textSecondary }]}
                  >
                    {chip}
                  </Text>
                </AnimatedButton>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        <SafeAreaView style={{ backgroundColor: theme.background }}>
          <View
            style={[
              styles.inputBar,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.insetInputContainer,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
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
              onPress={
                inputText.trim().length > 0 ? () => handleSend() : undefined
              }
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
                <View
                  style={[styles.sendBtn, { backgroundColor: theme.surface }]}
                >
                  <ArrowUp size={18} color={theme.icon} />
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
