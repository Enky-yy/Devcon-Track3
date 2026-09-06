import React, { createContext, useContext, useState } from 'react';
import { ethers } from 'ethers';
import deployments from '../contracts/deployments.json';

export interface Persona {
  id: string;
  name: string;
  ens: string;
  role: string;
  avatar: string;
  address: string;
  badge: string;
  balance: string;
  credits: number;
}

export const PRESET_PERSONAS: Persona[] = [
  {
    id: 'alice',
    name: 'Alice V.',
    ens: 'treasury.dao.eth',
    role: 'Treasury Lead',
    avatar: '⬡',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    badge: 'Core Signer',
    balance: '142.5 ETH',
    credits: 2500,
  },
  {
    id: 'bob',
    name: 'Bob M.',
    ens: '0xresearcher.eth',
    role: 'ZK Circuit Contributor',
    avatar: '◈',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    badge: 'Grantee',
    balance: '12.8 ETH',
    credits: 400,
  },
  {
    id: 'charlie',
    name: 'Charlie L.',
    ens: 'auditor-charlie.eth',
    role: 'Security Auditor',
    avatar: '◇',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    badge: 'Auditor Guild',
    balance: '45.0 ETH',
    credits: 625,
  },
];

interface Web3ContextType {
  currentPersona: Persona;
  setPersona: (p: Persona) => void;
  isLiveWallet: boolean;
  connectInjectedWallet: () => Promise<void>;
  disconnectInjectedWallet: () => void;
  contractAddresses: typeof deployments.contracts;
  timeOffset: number;
  fastForwardTime: (seconds: number) => void;
  notify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  toast: { msg: string; type: 'success' | 'info' | 'error' } | null;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<Persona>(PRESET_PERSONAS[0]);
  const [isLiveWallet, setIsLiveWallet] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const notify = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fastForwardTime = (seconds: number) => {
    setTimeOffset((prev) => prev + seconds);
    notify(`EVM timestamp advanced by +${seconds}s.`, 'info');
  };

  const connectInjectedWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const bal = await provider.getBalance(addr);
        const livePersona: Persona = {
          id: 'injected',
          name: 'Injected Account',
          ens: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          role: 'External Contributor',
          avatar: '⚡',
          address: addr,
          badge: 'Connected Wallet',
          balance: `${parseFloat(ethers.formatEther(bal)).toFixed(3)} ETH`,
          credits: 500,
        };
        setCurrentPersona(livePersona);
        setIsLiveWallet(true);
        notify(`Connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`);
      } catch (err: any) {
        notify(`Connection rejected: ${err.message}`, 'error');
      }
    } else {
      notify('No injected provider detected. Using local node accounts.', 'info');
    }
  };

  const disconnectInjectedWallet = () => {
    setIsLiveWallet(false);
    setCurrentPersona(PRESET_PERSONAS[0]);
    notify('Reset to local test account (treasury.dao.eth)', 'info');
  };

  return (
    <Web3Context.Provider
      value={{
        currentPersona,
        setPersona: (p) => {
          setIsLiveWallet(false);
          setCurrentPersona(p);
          notify(`Switched account to ${p.ens} (${p.badge})`, 'info');
        },
        isLiveWallet,
        connectInjectedWallet,
        disconnectInjectedWallet,
        contractAddresses: deployments.contracts,
        timeOffset,
        fastForwardTime,
        notify,
        toast,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider');
  return ctx;
};
