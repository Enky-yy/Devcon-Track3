import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { CheckCircle2, Terminal } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { contractAddresses } = useWeb3();

  const comparisons = [
    {
      feature: 'Voting Integrity & Bribery',
      traditional: 'Public snapshot allows instant bribe verification; flashloans swing results.',
      axiom: 'Commit-Reveal sealed ballot hides votes during voting; bribe verifiers cannot verify votes before tallying.',
      status: 'Axiom Protected',
    },
    {
      feature: 'Whale Domination (Plutocracy)',
      traditional: 'Linear 1-Token-1-Vote enables single whales to override community consensus.',
      axiom: 'Quadratic Voting (Power = √Credits) exponentially dampens whale power, elevating broad consensus.',
      status: 'Axiom Protected',
    },
    {
      feature: 'Payroll & Treasury Release',
      traditional: 'Centralized SaaS or upfront multi-sig transfers prone to non-delivery.',
      axiom: 'Milestone-based streaming escrow requiring cryptographic proof deliverables and client sign-off.',
      status: 'Axiom Protected',
    },
    {
      feature: 'Digital Artifact Provenance',
      traditional: 'Unverified GitHub links and Discord attachments prone to silent modification.',
      axiom: 'On-chain DAG lineage with cryptographic parentHash linkage and EIP-712 structured attestations.',
      status: 'Axiom Protected',
    },
    {
      feature: 'Off-Chain Operational Provenance',
      traditional: 'Unverifiable off-chain reports hosted on Google Drive or Notion.',
      axiom: 'Batched Merkle tree checkpoints on Ethereum with O(log N) inclusion proofs.',
      status: 'Axiom Protected',
    },
  ];

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-cyan">Formal Threat Model</span>
          <span className="badge badge-emerald">Mathematical Invariants</span>
          <span className="badge badge-purple">Track 3 Alignment</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '10px' }}>
          Protocol Architecture & Security Invariants
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '850px', lineHeight: '1.6' }}>
          Axiom Protocol replaces centralized trust assumptions with verifiable on-chain game theory and cryptography.
          Below is the threat model comparison, deployed contract registry, and mathematical proofs.
        </p>
      </div>

      {/* Threat Model Comparison Table */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
          ⚔️ Centralized Web3 Tooling vs. Axiom Protocol
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Vulnerability Vector</th>
                <th style={{ padding: '12px 16px' }}>Status Quo (Snapshot / Discord)</th>
                <th style={{ padding: '12px 16px', color: '#f4f4f5' }}>Axiom Protocol Architecture</th>
                <th style={{ padding: '12px 16px' }}>Guarantee</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f8fafc' }}>{c.feature}</td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{c.traditional}</td>
                  <td style={{ padding: '14px 16px', color: '#34d399', fontWeight: 500 }}>{c.axiom}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quadratic Voting Mathematical Proof Visualizer */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
          📐 Quadratic Voting Sybil & Whale Resistance Curve
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '18px' }}>
          Demonstration of how Quadratic Voting protects community consensus against concentrated capital:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#f43f5e', fontWeight: 700, marginBottom: '6px' }}>Linear Voting (Status Quo)</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>
              1 Whale with 400 tokens = <strong>400 votes</strong><br/>
              4 Contributors with 100 tokens = <strong>400 votes</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#f87171' }}>
              Whale ties or overcomes entire grassroots coalition effortlessly.
            </div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.28)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '6px' }}>Axiom Quadratic Voting (Power = √Credits)</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>
              1 Whale with 400 credits: √400 = <strong>20 votes</strong><br/>
              4 Contributors with 100 credits: 4 × √100 = 4 × 10 = <strong>40 votes!</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
              Grassroots community holds 2x the voting power of the whale!
            </div>
          </div>
        </div>
      </div>

      {/* Verified Smart Contract Deployments */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={20} color="#f4f4f5" /> Verified Deployed Smart Contracts (Localhost / Testnet)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {Object.entries(contractAddresses).map(([name, addr]) => (
            <div
              key={name}
              style={{
                background: 'rgba(18, 18, 22, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                {name}
              </div>
              <div className="mono" style={{ fontSize: '0.78rem', color: '#e4e4e7', wordBreak: 'break-all' }}>
                {addr}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Cancun EVM Target • viaIR Optimized
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
