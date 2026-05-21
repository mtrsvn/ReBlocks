import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import { getTheme } from './colors';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';

export interface FundingSource {
  id: string;
  name: string;
  type: 'bank' | 'card';
  last4: string;
  accountNumber: string;
  provider: string;
  gradient: string;
  isPrimary?: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  countryCode: string;
  currency: string;
  bankName: string;
  accountNumber: string;
  avatar?: string;
  type: 'bank' | 'wallet';
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  recipientAmount?: number;
  currency: string;
  recipientCurrency?: string;
  recipientId?: string;
  recipientName?: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  fee: number;
  exchangeRate?: number;
  fundingSourceId?: string;
  estimatedArrival?: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  address?: string;
  birthday?: string;
  emailVerified: boolean;
  KYCVerified: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  defaultCurrency: 'USD' | 'PHP';
  pin?: boolean;
  userPin?: number | null;
  pinsetup?: string | null;
  pinAttempt?: number;
  isLocked?: boolean;
  lockedUntil?: string | null;
  notifications?: boolean;
  twoFactorEnabled?: boolean;
  totpSecret?: string;
  biometricEnabled?: boolean;
  createdAt?: string;
  primaryPayment?: string | null;
}

interface AppContextType {
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  fundingSources: FundingSource[];
  recipients: Recipient[];
  transactions: Transaction[];
  exchangeRates: { [key: string]: number };
  activeFundingSourceId: string;
  primaryPaymentId: string;
  defaultCurrency: 'USD' | 'PHP';
  darkMode: boolean;
  setDefaultCurrency: (cur: 'USD' | 'PHP') => Promise<void>;
  setActiveFundingSourceId: (id: string) => void;
  setPrimaryPaymentId: (id: string) => Promise<void>;
  setDarkMode: (isDark: boolean) => void;
  addRecipient: (recipient: Omit<Recipient, 'id'>) => Promise<void>;
  updateRecipient: (id: string, recipient: Partial<Recipient>) => Promise<void>;
  deleteRecipient: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => Promise<void>;
  addFundingSource: (source: Omit<FundingSource, 'id'>) => Promise<void>;
  deleteFundingSource: (id: string) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [defaultCurrency, setDefaultCurrencyState] = useState<'USD' | 'PHP'>('USD');
  const [darkMode, setDarkMode] = useState(false);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [activeFundingSourceId, setActiveFundingSourceId] = useState('');
  const [primaryPaymentId, setPrimaryPaymentIdState] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({
    'PHP': 1,
    'SGD': 0.024,
    'THB': 0.56,
    'VND': 0.0024,
    'MYR': 0.12,
    'IDR': 0.0036,
    'USD': 0.018
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data && data.result === "success" && data.rates) {
          const apiRates = data.rates;
          const phpRate = apiRates['PHP'] || 58.42;
          
          setExchangeRates({
            'PHP': 1,
            'SGD': (apiRates['SGD'] || 1.34) / phpRate,
            'THB': (apiRates['THB'] || 34.65) / phpRate,
            'VND': (apiRates['VND'] || 25450) / phpRate,
            'MYR': (apiRates['MYR'] || 4.18) / phpRate,
            'IDR': (apiRates['IDR'] || 16120) / phpRate,
            'USD': 1 / phpRate,
          });
        }
      } catch (err) {
        console.log("Failed to fetch live exchange rates: ", err);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load dark mode preference on mount
  useEffect(() => {
    const loadDarkMode = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) {
          setDarkMode(saved === "true");
        }
      } catch (error) {
        console.log("Failed to load dark mode preference:", error);
      }
    };
    loadDarkMode();
  }, []);

  // Save dark mode preference when it changes
  useEffect(() => {
    const saveDarkMode = async () => {
      try {
        await AsyncStorage.setItem("dark_mode", darkMode.toString());
      } catch (error) {
        // Silent catch
      }
    };
    saveDarkMode();
  }, [darkMode]);

  useEffect(() => {
    let unsubscribeUser = () => {};
    let unsubscribeRecipients = () => {};
    let unsubscribeTransactions = () => {};
    let unsubscribeFundingSources = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthLoading(true);
        const userDocRef = doc(db, "users", user.uid);

        unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserProfile(data);
            setDefaultCurrencyState(data.defaultCurrency || 'USD');
            if (data.primaryPayment) {
              setPrimaryPaymentIdState(data.primaryPayment);
            }
          } else {
            setUserProfile(null);
          }
          setIsAuthLoading(false);
        }, (err) => {
          console.log("Error fetching user profile:", err);
          setIsAuthLoading(false);
        });

        const recipientsCol = collection(db, "users", user.uid, "recipients");
        unsubscribeRecipients = onSnapshot(recipientsCol, (snapshot) => {
          const loadedRecipients: Recipient[] = [];
          snapshot.forEach((d) => {
            loadedRecipients.push({ ...d.data(), id: d.id } as Recipient);
          });
          setRecipients(loadedRecipients);
        });

        const transactionsCol = collection(db, "users", user.uid, "transactions");
        const transactionsQuery = query(transactionsCol, orderBy("date", "desc"));
        unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
          const loadedTransactions: Transaction[] = [];
          snapshot.forEach((d) => {
            loadedTransactions.push({ ...d.data(), id: d.id } as Transaction);
          });
          setTransactions(loadedTransactions);
        });

        const fundingSourcesCol = collection(db, "users", user.uid, "fundingSources");
        unsubscribeFundingSources = onSnapshot(fundingSourcesCol, (snapshot) => {
          const loadedFundingSources: FundingSource[] = [];
          snapshot.forEach((d) => {
            loadedFundingSources.push({ ...d.data(), id: d.id } as FundingSource);
          });
          setFundingSources(loadedFundingSources);
          setActiveFundingSourceId((prev) => {
            if (prev && loadedFundingSources.some((fs) => fs.id === prev)) return prev;
            return loadedFundingSources[0]?.id || '';
          });
        });

      } else {
        setUserProfile(null);
        setRecipients([]);
        setTransactions([]);
        setFundingSources([]);
        setActiveFundingSourceId('');
        setIsAuthLoading(false);

        unsubscribeUser();
        unsubscribeRecipients();
        unsubscribeTransactions();
        unsubscribeFundingSources();
      }
    });

    return () => {
      unsubAuth();
      unsubscribeUser();
      unsubscribeRecipients();
      unsubscribeTransactions();
      unsubscribeFundingSources();
    };
  }, []);

  const setDefaultCurrency = async (cur: 'USD' | 'PHP') => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userDocRef, { defaultCurrency: cur });
  };

  const setPrimaryPaymentId = async (id: string) => {
    if (!auth.currentUser) return;
    setPrimaryPaymentIdState(id);
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userDocRef, { primaryPayment: id });
  };

  const addFundingSource = async (source: Omit<FundingSource, 'id'>) => {
    if (!auth.currentUser) return;
    const colRef = collection(db, "users", auth.currentUser.uid, "fundingSources");
    const docRef = await addDoc(colRef, source);
    // If it's the first card, auto-set as primary
    if (fundingSources.length === 0) {
      await setPrimaryPaymentId(docRef.id);
    }
  };

  const deleteFundingSource = async (id: string) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "users", auth.currentUser.uid, "fundingSources", id);
    await deleteDoc(docRef);
    // If deleted was primary, clear primary
    if (primaryPaymentId === id) {
      const remaining = fundingSources.filter(fs => fs.id !== id);
      if (remaining.length > 0) {
        await setPrimaryPaymentId(remaining[0].id);
      } else {
        await setPrimaryPaymentId('');
      }
    }
  };

  const addRecipient = async (recipient: Omit<Recipient, 'id'>) => {
    if (!auth.currentUser) return;
    const colRef = collection(db, "users", auth.currentUser.uid, "recipients");
    await addDoc(colRef, recipient);
  };

  const updateRecipient = async (id: string, updated: Partial<Recipient>) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "users", auth.currentUser.uid, "recipients", id);
    await updateDoc(docRef, updated);
  };

  const deleteRecipient = async (id: string) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "users", auth.currentUser.uid, "recipients", id);
    await deleteDoc(docRef);
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    if (!auth.currentUser) return;
    const colRef = collection(db, "users", auth.currentUser.uid, "transactions");
    await addDoc(colRef, {
      ...transaction,
      date: new Date().toISOString(),
      status: 'completed'
    });
  };

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userDocRef, profile);
  };

  return (
    <AppContext.Provider value={{ 
      userProfile, 
      isAuthLoading, 
      fundingSources, 
      recipients, 
      transactions, 
      exchangeRates, 
      activeFundingSourceId, 
      setActiveFundingSourceId, 
      primaryPaymentId,
      setPrimaryPaymentId,
      defaultCurrency, 
      setDefaultCurrency,
      darkMode,
      setDarkMode,
      addRecipient, 
      updateRecipient, 
      deleteRecipient, 
      addTransaction,
      addFundingSource,
      deleteFundingSource,
      updateUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const useTheme = () => {
  const { darkMode } = useApp();
  return getTheme(darkMode);
};
