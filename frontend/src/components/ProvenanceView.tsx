import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { type ArtifactItem, INITIAL_ARTIFACTS } from '../lib/mockData';
import { ethers } from 'ethers';
import { GitBranch, CheckCircle, Plus, Shield, FileText, ArrowRight } from 'lucide-react';

export const ProvenanceView: React.FC = () => {
  const { currentPersona, notify } = useWeb3();
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>(INITIAL_ARTIFACTS);

  // Register Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [parentHash, setParentHash] = useState(ethers.ZeroHash);
  const [artifactContent, setArtifactContent] = useState('');
  const [metadataURI, setMetadataURI] = useState('');

  // Attestation Modal
  const [activeArtifact, setActiveArtifact] = useState<ArtifactItem | null>(null);
  const [attestRole, setAttestRole] = useState('Lead Security Auditor');
  const [attestStatement, setAttestStatement] = useState('');

  // Register Artifact
  const handleRegisterArtifact = () => {
    if (!newTitle.trim()) {
      notify('Artifact title required', 'error');
      return;
    }

    const calculatedHash = ethers.id(artifactContent || newTitle + Date.now());
    const parent = artifacts.find((a) => a.artifactHash === parentHash);
    const version = parent ? parent.version + 1 : 1;

    const newArt: ArtifactItem = {
      artifactHash: calculatedHash,
      parentHash: parentHash,
      version: version,
      title: newTitle,
      author: currentPersona.address,
      authorName: currentPersona.name,
      metadataURI: metadataURI || `ipfs://bafybeiaxiomartifact${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      attestations: [],
    };

    setArtifacts([newArt, ...artifacts]);
    notify(`Artifact registered on-chain! Version ${version} anchored to DAG.`);
    setShowRegisterModal(false);
    setNewTitle('');
    setArtifactContent('');
  };

  // Sign and submit EIP-712 Attestation
  const handleSignAttestation = () => {
    if (!activeArtifact) return;
    if (!attestStatement.trim()) {
      notify('Attestation statement required', 'error');
      return;
    }

    const newAttestation = {
      signer: currentPersona.address,
      signerName: currentPersona.name,
      role: attestRole,
      statement: attestStatement,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    };

    setArtifacts((prev) =>
      prev.map((art) =>
        art.artifactHash === activeArtifact.artifactHash
          ? { ...art, attestations: [...art.attestations, newAttestation] }
          : art
      )
    );

    notify(`EIP-712 Attestation signed by ${currentPersona.name} (${attestRole})!`);
    setActiveArtifact(null);
    setAttestStatement('');
  };

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-purple">On-Chain Attribution</span>
              <span className="badge badge-cyan">DAG Lineage Provenance</span>
              <span className="badge badge-emerald">EIP-712 Cryptographic Signoffs</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '10px' }}>
              Digital Artifact & Research Provenance Registry
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '850px', lineHeight: '1.6' }}>
              Prove the authorship, origin, and non-repudiable revision history of governance proposals, whitepapers,
              audit reports, and AI datasets. Cryptographic DAG pointers link every child revision directly to its parent hash,
              preventing retroactive tampering and fighting misinformation without centralized registries.
            </p>
          </div>
          <button
            id="register-artifact-btn"
            className="btn btn-primary"
            onClick={() => setShowRegisterModal(true)}
          >
            <Plus size={18} /> Register Artifact Version
          </button>
        </div>
      </div>

      {/* DAG Lineage Visualizer */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <GitBranch size={20} color="#38bdf8" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Lineage Version DAG (Directed Acyclic Graph)</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
          {artifacts
            .slice()
            .sort((a, b) => a.version - b.version)
            .map((art, idx, arr) => (
              <React.Fragment key={art.artifactHash}>
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    minWidth: '280px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-cyan">VERSION {art.version}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{art.timestamp.slice(0, 10)}</span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>{art.title}</h4>
                  <div className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '4px' }}>
                    Hash: {art.artifactHash.slice(0, 14)}...
                  </div>
                  <div className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Parent: {art.parentHash === ethers.ZeroHash ? 'GENESIS ROOT' : art.parentHash.slice(0, 14) + '...'}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981' }}>
                    <CheckCircle size={14} /> {art.attestations.length} Peer Attestation(s)
                  </div>
                </div>

                {idx < arr.length - 1 && (
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={22} />
                  </div>
                )}
              </React.Fragment>
            ))}
        </div>
      </div>

      {/* Artifacts Cards with Attestation Details */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📜</span> Registered Digital Artifacts & Attestations
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {artifacts.map((art) => (
          <div key={art.artifactHash} className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span className="badge badge-purple">v{art.version}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{art.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <span>Author: <strong style={{ color: '#f8fafc' }}>{art.authorName}</strong> ({art.author.slice(0, 6)}...{art.author.slice(-4)})</span>
                  <span>Registered: {art.timestamp}</span>
                </div>
              </div>

              <button
                id={`attest-btn-${art.version}`}
                className="btn btn-secondary"
                onClick={() => setActiveArtifact(art)}
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                <Shield size={14} /> Add Cryptographic Attestation
              </button>
            </div>

            {/* Hashes Banner */}
            <div style={{ background: 'rgba(11, 17, 32, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Artifact Content Hash: </span>
                <span className="mono" style={{ color: '#38bdf8' }}>{art.artifactHash}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Parent Lineage Pointer: </span>
                <span className="mono" style={{ color: art.parentHash === ethers.ZeroHash ? '#10b981' : '#c084fc' }}>
                  {art.parentHash === ethers.ZeroHash ? 'Genesis (Root)' : art.parentHash}
                </span>
              </div>
            </div>

            {/* Attestations List */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#10b981" />
                Verified EIP-712 Peer Attestations ({art.attestations.length}):
              </div>

              {art.attestations.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                  No peer attestations recorded yet. Be the first auditor to sign.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                  {art.attestations.map((att, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#f8fafc' }}>{att.signerName}</span>
                        <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>{att.role}</span>
                      </div>
                      <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px' }}>
                        "{att.statement}"
                      </p>
                      <div className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Signer: {att.signer.slice(0, 8)}...{att.signer.slice(-6)} • {att.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* REGISTER ARTIFACT MODAL */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Register Digital Artifact</h3>
              </div>
              <button onClick={() => setShowRegisterModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Artifact Title</label>
              <input
                id="artifact-title-input"
                className="input-field"
                placeholder="e.g. Axiom Whitepaper v3.0 or ZK Audit Deliverable"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Parent Lineage Version</label>
              <select
                className="input-field mono"
                value={parentHash}
                onChange={(e) => setParentHash(e.target.value)}
              >
                <option value={ethers.ZeroHash}>Genesis Root (New Lineage Tree)</option>
                {artifacts.map((a) => (
                  <option key={a.artifactHash} value={a.artifactHash}>
                    v{a.version}: {a.title.slice(0, 35)}... ({a.artifactHash.slice(0, 10)}...)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Raw Document Text / Payload to Hash</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Paste payload, code, or paper abstract to compute cryptographic SHA-256 hash..."
                value={artifactContent}
                onChange={(e) => setArtifactContent(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Off-Chain Storage URI (IPFS / Arweave)</label>
              <input
                className="input-field mono"
                placeholder="ipfs://bafybei..."
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</button>
              <button id="submit-artifact-btn" className="btn btn-primary" onClick={handleRegisterArtifact}>
                Anchor to On-Chain DAG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ATTESTATION MODAL */}
      {activeArtifact && (
        <div className="modal-overlay" onClick={() => setActiveArtifact(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>EIP-712 Cryptographic Attestation</h3>
              </div>
              <button onClick={() => setActiveArtifact(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '16px' }}>
              Signing attestation for: <strong style={{ color: '#f8fafc' }}>{activeArtifact.title}</strong>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Auditor / Verifier Role</label>
              <select
                className="input-field"
                value={attestRole}
                onChange={(e) => setAttestRole(e.target.value)}
              >
                <option value="Lead Security Auditor">Lead Security Auditor</option>
                <option value="Reproducibility Verifier">Reproducibility Verifier</option>
                <option value="DAO Working Group Signer">DAO Working Group Signer</option>
                <option value="Peer Reviewer">Peer Reviewer</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Attestation Statement</label>
              <textarea
                id="attest-statement-input"
                className="input-field"
                rows={3}
                placeholder="e.g. Cryptographic benchmarks replicated independently with 100% fidelity..."
                value={attestStatement}
                onChange={(e) => setAttestStatement(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setActiveArtifact(null)}>Cancel</button>
              <button id="confirm-attest-btn" className="btn btn-emerald" onClick={handleSignAttestation}>
                Sign with EIP-712 & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
