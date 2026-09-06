import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { INITIAL_MERKLE_TREE, INITIAL_MERKLE_LEAF_ITEMS, INITIAL_KEYLESS_ATTESTATIONS, type KeylessAttestationItem } from '../lib/mockData';
import { verifyMerkleProof } from '../lib/crypto';
import { CheckCircle2, XCircle, ShieldCheck, Layers, Code2, Mail, Plus } from 'lucide-react';
import { ethers } from 'ethers';

export const TransparencyView: React.FC = () => {
  const { currentPersona, notify } = useWeb3();

  // Selected leaf for proof verification
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number>(0);
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failed' | null>('success');

  // Keyless Attestations State
  const [keylessList, setKeylessList] = useState<KeylessAttestationItem[]>(INITIAL_KEYLESS_ATTESTATIONS);
  const [showOidcModal, setShowOidcModal] = useState(false);
  const [oidcProvider, setOidcProvider] = useState<'github' | 'google'>('github');
  const [oidcIdentifier, setOidcIdentifier] = useState('vitalik-maintainer');
  const [oidcRole, setOidcRole] = useState('Lead Maintainer');
  const [oidcDeliverableHash, setOidcDeliverableHash] = useState('sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');

  const selectedItemText = INITIAL_MERKLE_LEAF_ITEMS[selectedLeafIndex];
  const actualLeafHash = ethers.id(selectedItemText);
  const evaluatedLeafHash = isTampered ? ethers.id(selectedItemText + ' [TAMPERED_ROGUE_INJECTION]') : actualLeafHash;

  const currentProof = INITIAL_MERKLE_TREE.proofs[actualLeafHash] || [];

  const handleVerify = () => {
    const valid = verifyMerkleProof(currentProof, INITIAL_MERKLE_TREE.root, evaluatedLeafHash);
    if (valid) {
      setVerificationResult('success');
      notify('Cryptographic inclusion verified! Proof matches on-chain Merkle root.');
    } else {
      setVerificationResult('failed');
      notify('Tamper detected! Merkle path does not match on-chain root.', 'error');
    }
  };

  const handleRecordOidcAttestation = () => {
    if (!oidcIdentifier.trim()) {
      notify('Identity username / email required', 'error');
      return;
    }

    const claimText = oidcProvider === 'github'
      ? `github:user:${oidcIdentifier} (GitHub Verified)`
      : `google:${oidcIdentifier} (OIDC Workspace Verified)`;

    const newAttestation: KeylessAttestationItem = {
      deliverableHash: oidcDeliverableHash,
      issuer: oidcProvider === 'github' ? 'https://github.com/login/oauth' : 'https://accounts.google.com',
      identityClaim: claimText,
      role: oidcRole,
      relayer: currentPersona.address,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      verified: true,
    };

    setKeylessList([newAttestation, ...keylessList]);
    notify(`Keyless Attestation recorded on-chain via ${oidcProvider === 'github' ? 'GitHub' : 'Google'} OIDC!`);
    setShowOidcModal(false);
  };

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-cyan">Verifiable DAO Workflows</span>
              <span className="badge badge-emerald">Merkle Transparency Log</span>
              <span className="badge badge-purple">Keyless OIDC Attestations</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '10px' }}>
              DAO Transparency Log & Keyless Attestation Layer
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '850px', lineHeight: '1.6' }}>
              Working group outputs, Git commits, and emergency sign-offs are anchored to Ethereum as Merkle checkpoints.
              Furthermore, DAO contributors can cryptographically sign deliverable milestones using <strong>GitHub or Google OIDC identities</strong>
              verified against transparency logs—eliminating Web3 key management hurdles for non-crypto researchers.
            </p>
          </div>
          <button
            id="open-oidc-modal-btn"
            className="btn btn-primary"
            onClick={() => setShowOidcModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Keyless OIDC Attestation
          </button>
        </div>
      </div>

      {/* Keyless OIDC Attestations Section (Track 3 Requirement #4) */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔑</span> Keyless Identity Attestations (GitHub & Google OIDC)
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '2px' }}>
              Milestone deliveries cryptographically signed by off-chain identities verified against on-chain transparency logs.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {keylessList.map((att, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(11, 17, 32, 0.7)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {att.issuer.includes('github') ? <Code2 size={12} /> : <Mail size={12} />}
                  {att.issuer.includes('github') ? 'GitHub OAuth' : 'Google Workspace'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{att.timestamp}</span>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                {att.identityClaim}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '8px', fontWeight: 600 }}>
                Role: {att.role}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.72rem', marginBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>Deliverable Hash: </span>
                <span className="mono" style={{ color: '#34d399' }}>{att.deliverableHash.slice(0, 20)}...</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                <CheckCircle2 size={13} /> Authenticated via Transparency Oracle
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Committed Checkpoint Card */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} color="#38bdf8" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Committed Checkpoint #1: DAO Working Group Deliverables Q3</h3>
          </div>
          <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Root Anchored On-Chain
          </span>
        </div>

        <div style={{ background: 'rgba(11, 17, 32, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>On-Chain Merkle Root:</span>
            <div className="mono" style={{ color: '#38bdf8', fontWeight: 700, wordBreak: 'break-all', marginTop: '4px' }}>
              {INITIAL_MERKLE_TREE.root}
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Batch Size & Snapshot:</span>
            <div style={{ marginTop: '4px', color: '#f8fafc' }}>
              4 Verified Leaves • <a href="#snapshot" style={{ color: '#c084fc', textDecoration: 'none' }}>ipfs://bafybeibatcharchive...</a>
            </div>
          </div>
        </div>

        {/* Leaves Selection */}
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>
          Select an Off-Chain Deliverable Leaf to Inspect Inclusion Proof:
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {INITIAL_MERKLE_LEAF_ITEMS.map((item, idx) => {
            const isSelected = selectedLeafIndex === idx;
            return (
              <div
                key={idx}
                id={`merkle-leaf-${idx}`}
                onClick={() => {
                  setSelectedLeafIndex(idx);
                  setIsTampered(false);
                  setVerificationResult('success');
                }}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                  border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>LEAF #{idx}</span>
                  {isSelected && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Selected</span>}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                  {item}
                </div>
                <div className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Hash: {ethers.id(item).slice(0, 18)}...
                </div>
              </div>
            );
          })}
        </div>

        {/* Proof Inspector and Verifier */}
        <div style={{ background: 'rgba(11, 17, 32, 0.9)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cryptographic Proof Inspector</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Verifies that Leaf #{selectedLeafIndex} is mathematically linked to the on-chain Merkle root.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="toggle-tamper-btn"
                className="btn btn-secondary"
                onClick={() => {
                  const nextTampered = !isTampered;
                  setIsTampered(nextTampered);
                  const valid = verifyMerkleProof(currentProof, INITIAL_MERKLE_TREE.root, nextTampered ? ethers.id(selectedItemText + ' [TAMPERED_ROGUE_INJECTION]') : actualLeafHash);
                  setVerificationResult(valid ? 'success' : 'failed');
                  notify(nextTampered ? 'Injected fake rogue deliverable byte!' : 'Restored authentic deliverable.', 'info');
                }}
                style={{ fontSize: '0.8rem', padding: '8px 14px', color: isTampered ? '#f43f5e' : '#cbd5e1' }}
              >
                {isTampered ? '⚠️ Revert to Authentic Leaf' : '🧪 Simulate Tampered Leaf'}
              </button>

              <button
                id="verify-inclusion-btn"
                className="btn btn-primary"
                onClick={handleVerify}
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
              >
                <ShieldCheck size={16} /> Verify Proof On-Chain
              </button>
            </div>
          </div>

          {/* Leaf Hash Display */}
          <div style={{ marginBottom: '14px', fontSize: '0.825rem' }}>
            <span style={{ color: '#94a3b8' }}>Evaluated Leaf Hash: </span>
            <span className="mono" style={{ color: isTampered ? '#f43f5e' : '#34d399', fontWeight: 600 }}>
              {evaluatedLeafHash}
            </span>
            {isTampered && <span className="badge badge-amber" style={{ marginLeft: '8px' }}>Tampered</span>}
          </div>

          {/* Merkle Proof Siblings */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>
              Proof Path Siblings ({currentProof.length} steps):
            </div>
            {currentProof.map((sibling, i) => (
              <div key={i} className="mono" style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#c084fc', marginBottom: '4px' }}>
                Proof[{i}]: {sibling}
              </div>
            ))}
          </div>

          {/* Verification Status Banner */}
          {verificationResult === 'success' && (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', fontSize: '0.9rem', fontWeight: 600 }}>
              <CheckCircle2 size={20} />
              CRYPTOGRAPHICALLY VERIFIED: Leaf is authentic and immutably present in on-chain root!
            </div>
          )}

          {verificationResult === 'failed' && (
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid #f43f5e', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
              <XCircle size={20} />
              VERIFICATION FAILED: Tampered leaf hash does not resolve to the committed Merkle root!
            </div>
          )}
        </div>
      </div>

      {/* RECORD KEYLESS OIDC ATTESTATION MODAL */}
      {showOidcModal && (
        <div className="modal-overlay" onClick={() => setShowOidcModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Keyless OIDC Deliverable Sign-Off</h3>
              </div>
              <button onClick={() => setShowOidcModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
              Sign off on a milestone delivery using your verified Web2 developer identity (GitHub / Google Workspace) without private keys:
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Identity Provider</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setOidcProvider('github')}
                  style={{
                    background: oidcProvider === 'github' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    border: oidcProvider === 'github' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Code2 size={16} /> GitHub Identity
                </button>
                <button
                  type="button"
                  onClick={() => setOidcProvider('google')}
                  style={{
                    background: oidcProvider === 'google' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    border: oidcProvider === 'google' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Mail size={16} /> Google Workspace
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                {oidcProvider === 'github' ? 'GitHub Username' : 'Google Email Address'}
              </label>
              <input
                id="oidc-username-input"
                className="input-field"
                value={oidcIdentifier}
                onChange={(e) => setOidcIdentifier(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Role in Working Group</label>
              <input
                className="input-field"
                value={oidcRole}
                onChange={(e) => setOidcRole(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Target Deliverable Hash</label>
              <input
                className="input-field mono"
                style={{ fontSize: '0.78rem' }}
                value={oidcDeliverableHash}
                onChange={(e) => setOidcDeliverableHash(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowOidcModal(false)}>Cancel</button>
              <button id="submit-oidc-attest-btn" className="btn btn-primary" onClick={handleRecordOidcAttestation}>
                Anchor Keyless Attestation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
