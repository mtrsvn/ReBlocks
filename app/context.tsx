import React, { createContext, useContext, useState } from 'react';

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

interface AppContextType {
  fundingSources: FundingSource[];
  recipients: Recipient[];
  transactions: Transaction[];
  exchangeRates: { [key: string]: number };
  activeFundingSourceId: string;
  setActiveFundingSourceId: (id: string) => void;
  addRecipient: (recipient: Omit<Recipient, 'id'>) => void;
  updateRecipient: (id: string, recipient: Partial<Recipient>) => void;
  deleteRecipient: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fundingSources] = useState<FundingSource[]>([
    { id: 'fs1', name: 'Main Savings', type: 'bank', last4: '8842', accountNumber: '0012 3456 7890 8842', provider: 'BPI', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
    { id: 'fs2', name: 'Travel Card', type: 'card', last4: '1099', accountNumber: '4532 7890 1234 1099', provider: 'Visa', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
  ]);
  const [activeFundingSourceId, setActiveFundingSourceId] = useState('fs1');
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', name: 'Maria Mendoza', countryCode: 'ph', currency: 'PHP', bankName: 'GCash', accountNumber: '0917 123 4567', type: 'wallet' },
    { id: '2', name: 'Siti Rahman', countryCode: 'sg', currency: 'SGD', bankName: 'DBS Bank', accountNumber: '1234 5678 90', type: 'bank' },
    { id: '3', name: 'Nguyen Van', countryCode: 'vn', currency: 'VND', bankName: 'Vietcombank', accountNumber: '1234567890', type: 'bank' },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'tx1', type: 'send', amount: 1515, currency: 'PHP', recipientName: 'Maria Mendoza', date: new Date(Date.now() - 86400000).toISOString(), status: 'completed', fee: 15, fundingSourceId: 'fs1', recipientAmount: 1500, recipientCurrency: 'PHP', exchangeRate: 1 },
    { id: 'tx2', type: 'send', amount: 4182, currency: 'PHP', recipientName: 'Siti Rahman', date: new Date(Date.now() - 172800000).toISOString(), status: 'completed', fee: 15, fundingSourceId: 'fs1', recipientAmount: 100, recipientCurrency: 'SGD', exchangeRate: 0.024 },
    { id: 'tx3', type: 'send', amount: 1801, currency: 'PHP', recipientName: 'Nguyen Van', date: new Date(Date.now() - 259200000).toISOString(), status: 'completed', fee: 15, fundingSourceId: 'fs1', recipientAmount: 1000, recipientCurrency: 'VND', exchangeRate: 0.0024 },
    { id: 'tx4', type: 'send', amount: 2515, currency: 'PHP', recipientName: 'Maria Mendoza', date: new Date(Date.now() - 432000000).toISOString(), status: 'completed', fee: 15, fundingSourceId: 'fs1', recipientAmount: 2500, recipientCurrency: 'PHP', exchangeRate: 1 },
    { id: 'tx5', type: 'send', amount: 3348, currency: 'PHP', recipientName: 'Siti Rahman', date: new Date(Date.now() - 604800000).toISOString(), status: 'completed', fee: 15, fundingSourceId: 'fs1', recipientAmount: 80, recipientCurrency: 'SGD', exchangeRate: 0.024 },
  ]);

  const exchangeRates = {
    'PHP': 1,
    'SGD': 0.024,
    'THB': 0.56,
    'VND': 0.0024,
    'MYR': 0.12,
    'IDR': 0.0036,
    'USD': 0.018
  };

  const addRecipient = (recipient: Omit<Recipient, 'id'>) => {
    const newRecipient = { ...recipient, id: Math.random().toString(36).substr(2, 9) };
    setRecipients(prev => [...prev, newRecipient]);
  };

  const updateRecipient = (id: string, updated: Partial<Recipient>) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
  };

  const deleteRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    const newTx: Transaction = {
      ...transaction,
      id: 'tx-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      status: 'completed'
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  return (
    <AppContext.Provider value={{ fundingSources, recipients, transactions, exchangeRates, activeFundingSourceId, setActiveFundingSourceId, addRecipient, updateRecipient, deleteRecipient, addTransaction }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
