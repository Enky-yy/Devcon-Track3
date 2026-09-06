import React, { useState } from 'react';
import { Web3Provider } from './context/Web3Context';
import { Navbar } from './components/Navbar';
import { GovernanceView } from './components/GovernanceView';
import { BountyEscrowView } from './components/BountyEscrowView';
import { ProvenanceView } from './components/ProvenanceView';
import { TransparencyView } from './components/TransparencyView';
import { AnalyticsView } from './components/AnalyticsView';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('governance');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1 }}>
        {activeTab === 'governance' && <GovernanceView />}
        {activeTab === 'escrow' && <BountyEscrowView />}
        {activeTab === 'provenance' && <ProvenanceView />}
        {activeTab === 'transparency' && <TransparencyView />}
        {activeTab === 'analytics' && <AnalyticsView />}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(6, 9, 19, 0.95)', padding: '24px', marginTop: '60px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: '#94a3b8' }}>
          <div>
            <strong style={{ color: '#f8fafc' }}>Axiom Protocol</strong> — Hackathon Track 3: Decentralized Coordination Layers & Verifiable Governance
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>Solidity 0.8.24 (Cancun viaIR)</span>
            <span>•</span>
            <span>Commit-Reveal MACI Architecture</span>
            <span>•</span>
            <span>OpenZeppelin Verifiable Merkle Proofs</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
};

export default App;
