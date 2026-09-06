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
    <header style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(9, 9, 11, 0.95)' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 99999,
            background: toast.type === 'error' ? '#271014' : toast.type === 'info' ? '#18181b' : '#0d2818',
            border: `1px solid ${toast.type === 'error' ? '#f43f5e' : toast.type === 'info' ? 'rgba(255,255,255,0.25)' : '#22c55e'}`,
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
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
      <div style={{ background: '#121215', padding: '6px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a1a1aa' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
          <span style={{ fontWeight: 600, color: '#f4f4f5' }}>Axiom Protocol</span>
          <span style={{ color: '#52525b' }}>•</span>
          <span>EVM Cancun</span>
          <span style={{ color: '#52525b' }}>•</span>
          <span className="mono" style={{ color: '#e4e4e7' }}>Chain ID: 31337</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="start-judge-tour-btn"
            onClick={() => setShowDemoModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#f4f4f5',
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

          <span style={{ color: '#71717a' }}>Time Warp:</span>
          <button
            onClick={() => fastForwardTime(600)}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#d4d4d8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            title="Fast forward EVM timestamp by 10 minutes"
          >
            <FastForward size={11} /> +10m
          </button>
          <button
            onClick={() => fastForwardTime(3600)}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#d4d4d8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
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
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f4f4f5', border: '1px solid rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#09090b" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>AXIOM</span>
              <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '2px 6px' }}>CORE</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Decentralized Coordination & Verifiable Governance</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(24, 24, 28, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            const TabIcon = t.Icon;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#a1a1aa',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid transparent',
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
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(24, 24, 28, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '4px 6px', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', paddingLeft: '4px' }}>Account:</span>
            {PRESET_PERSONAS.map((p) => {
              const isSelected = !isLiveWallet && currentPersona.id === p.id;
              return (
                <button
                  key={p.id}
                  id={`persona-btn-${p.id}`}
                  onClick={() => setPersona(p)}
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                    color: isSelected ? '#ffffff' : '#a1a1aa',
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
                background: isLiveWallet ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isLiveWallet ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isLiveWallet ? '#4ade80' : '#a1a1aa',
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
      <div style={{ background: 'rgba(18, 18, 22, 0.6)', padding: '5px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a1a1aa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="mono" style={{ color: '#f4f4f5' }}>{currentPersona.ens}</span>
          <span>•</span>
          <span>{currentPersona.role}</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>{currentPersona.badge}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="mono" style={{ color: '#71717a' }}>{currentPersona.address.slice(0, 8)}...{currentPersona.address.slice(-6)}</span>
          <span>Balance: <strong style={{ color: '#f4f4f5' }}>{currentPersona.balance}</strong></span>
          <span>QV Balance: <strong style={{ color: '#f4f4f5' }}>{currentPersona.credits} credits</strong></span>
        </div>
      </div>

      {/* Protocol Walkthrough Modal */}
      <JudgeDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} setActiveTab={setActiveTab} />
    </header>
  );
};
