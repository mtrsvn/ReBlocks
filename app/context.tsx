import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
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
  kycStatus: 'pending' | 'verified' | 'failed';
  defaultCurrency: 'USD' | 'PHP';
  pin?: boolean;
  userPin?: number;
  pinsetup?: string | null;
  pinAttempt?: number;
  isLocked?: boolean;
  lockedUntil?: string | null;
}

interface AppContextType {
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  fundingSources: FundingSource[];
  recipients: Recipient[];
  transactions: Transaction[];
  exchangeRates: { [key: string]: number };
  activeFundingSourceId: string;
  defaultCurrency: 'USD' | 'PHP';
  setDefaultCurrency: (cur: 'USD' | 'PHP') => Promise<void>;
  setActiveFundingSourceId: (id: string) => void;
  addRecipient: (recipient: Omit<Recipient, 'id'>) => Promise<void>;
  updateRecipient: (id: string, recipient: Partial<Recipient>) => Promise<void>;
  deleteRecipient: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [defaultCurrency, setDefaultCurrencyState] = useState<'USD' | 'PHP'>('USD');
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [activeFundingSourceId, setActiveFundingSourceId] = useState('');
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

            if (user.emailVerified && !data.isVerified && data.kycStatus === 'pending') {
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
        unsubscribeFundingSources = onSnapshot(fundingSourcesCol, async (snapshot) => {
          const loadedFundingSources: FundingSource[] = [];
          snapshot.forEach((d) => {
            loadedFundingSources.push({ ...d.data(), id: d.id } as FundingSource);
          });

          if (loadedFundingSources.length === 0) {
            const defaultFS: Omit<FundingSource, 'id'>[] = [
              { name: 'Main Savings', type: 'bank', last4: '8842', accountNumber: '0012 3456 7890 8842', provider: 'BPI', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
              { name: 'Travel Card', type: 'card', last4: '1099', accountNumber: '4532 7890 1234 1099', provider: 'Visa', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
            ];
            for (const fsItem of defaultFS) {
              await addDoc(fundingSourcesCol, fsItem);
            }
          } else {
            setFundingSources(loadedFundingSources);
            setActiveFundingSourceId((prev) => {
              if (prev && loadedFundingSources.some((fs) => fs.id === prev)) {
                return prev;
              }
              return loadedFundingSources[0]?.id || '';
            });
          }
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
      defaultCurrency, 
      setDefaultCurrency, 
      addRecipient, 
      updateRecipient, 
      deleteRecipient, 
      addTransaction,
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
