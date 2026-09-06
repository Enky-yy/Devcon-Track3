import React, { useState } from 'react';
import { useWeb3, PRESET_PERSONAS } from '../context/Web3Context';
import { Shield, FastForward, Wallet, CheckCircle2, Play, Vote, FileCheck, GitFork, Search, BarChart3 } from 'lucide-react';
import { JudgeDemoModal } from './JudgeDemoModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentPersona, setPersona, isLiveWallet, connectInjectedWallet, disconnectInjectedWallet, fastForwardTime, toast } = useWeb3();
  const [showDemoModal, setShowDemoModal] = useState(false);

  const tabs = [
    { id: 'governance', label: 'Governance & QV', Icon: Vote },
    { id: 'escrow', label: 'Escrow & Streams', Icon: FileCheck },
    { id: 'provenance', label: 'Artifact DAG', Icon: GitFork },
    { id: 'transparency', label: 'Transparency Log', Icon: Search },
    { id: 'analytics', label: 'Invariants & Specs', Icon: BarChart3 },
  ];

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(8, 11, 17, 0.92)' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 99999,
            background: toast.type === 'error' ? '#881337' : toast.type === 'info' ? '#1e3a8a' : '#064e3b',
            border: `1px solid ${toast.type === 'error' ? '#f43f5e' : toast.type === 'info' ? '#60a5fa' : '#10b981'}`,
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
            fontSize: '0.85rem',
            animation: 'slideIn 0.25s ease',
          }}
        >
          <CheckCircle2 size={16} />
          {toast.msg}
        </div>
      )}

      {/* Top Protocol Utility Bar */}
      <div style={{ background: '#0a0e19', padding: '6px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>Axiom Protocol</span>
          <span style={{ color: '#64748b' }}>•</span>
          <span>EVM Cancun</span>
          <span style={{ color: '#64748b' }}>•</span>
          <span className="mono" style={{ color: '#60a5fa' }}>Chain ID: 31337</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="start-judge-tour-btn"
            onClick={() => setShowDemoModal(true)}
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Play size={11} /> Simulate Protocol Run
          </button>

          <span style={{ color: '#64748b' }}>Time Warp:</span>
          <button
            onClick={() => fastForwardTime(600)}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            title="Fast forward EVM timestamp by 10 minutes"
          >
            <FastForward size={11} /> +10m
          </button>
          <button
            onClick={() => fastForwardTime(3600)}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            title="Fast forward EVM timestamp by 1 hour"
          >
            <FastForward size={11} /> +1h
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('governance')}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#2563eb', border: '1px solid rgba(147, 197, 253, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>AXIOM</span>
              <span className="badge badge-blue" style={{ fontSize: '0.625rem', padding: '2px 6px' }}>CORE</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Decentralized Coordination & Verifiable Governance</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(14, 19, 31, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            const TabIcon = t.Icon;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: isActive ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <TabIcon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Account Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(14, 19, 31, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '4px 6px', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', paddingLeft: '4px' }}>Account:</span>
            {PRESET_PERSONAS.map((p) => {
              const isSelected = !isLiveWallet && currentPersona.id === p.id;
              return (
                <button
                  key={p.id}
                  id={`persona-btn-${p.id}`}
                  onClick={() => setPersona(p)}
                  style={{
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                    color: isSelected ? '#f8fafc' : '#94a3b8',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                  title={`${p.name} (${p.role}) - ${p.address}`}
                >
                  <span className="mono">{p.ens}</span>
                </button>
              );
            })}

            <button
              id="wallet-connect-btn"
              onClick={isLiveWallet ? disconnectInjectedWallet : connectInjectedWallet}
              style={{
                background: isLiveWallet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isLiveWallet ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isLiveWallet ? '#34d399' : '#94a3b8',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              <Wallet size={12} />
              {isLiveWallet ? 'Connected' : 'Injected'}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info Details */}
      <div style={{ background: 'rgba(10, 14, 25, 0.6)', padding: '5px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="mono" style={{ color: '#f8fafc' }}>{currentPersona.ens}</span>
          <span>•</span>
          <span>{currentPersona.role}</span>
          <span className="badge badge-indigo" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>{currentPersona.badge}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="mono" style={{ color: '#64748b' }}>{currentPersona.address.slice(0, 8)}...{currentPersona.address.slice(-6)}</span>
          <span>Balance: <strong style={{ color: '#f8fafc' }}>{currentPersona.balance}</strong></span>
          <span>QV Balance: <strong style={{ color: '#60a5fa' }}>{currentPersona.credits} credits</strong></span>
        </div>
      </div>

      {/* Protocol Walkthrough Modal */}
      <JudgeDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} setActiveTab={setActiveTab} />
    </header>
  );
};
