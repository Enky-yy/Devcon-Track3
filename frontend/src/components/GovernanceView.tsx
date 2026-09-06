import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { type ProposalItem, INITIAL_PROPOSALS } from '../lib/mockData';
import { computeCommitment, generateBlindingSalt, calculateQuadraticPower } from '../lib/crypto';
import { Lock, Unlock, Sparkles, TrendingUp, CheckCircle, ShieldAlert, KeyRound, RefreshCw } from 'lucide-react';

export const GovernanceView: React.FC = () => {
  const { currentPersona, timeOffset, notify } = useWeb3();
  const [proposals, setProposals] = useState<ProposalItem[]>(INITIAL_PROPOSALS);

  // Commit Modal State
  const [commitModalProp, setCommitModalProp] = useState<ProposalItem | null>(null);
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [voteChoice, setVoteChoice] = useState<number>(1);
  const [voteCredits, setVoteCredits] = useState<number>(100);
  const [blindingSalt, setBlindingSalt] = useState<string>('');

  // Reveal Modal State
  const [revealModalProp, setRevealModalProp] = useState<ProposalItem | null>(null);
  const [revealChoice, setRevealChoice] = useState<number>(1);
  const [revealCredits, setRevealCredits] = useState<number>(100);
  const [revealSalt, setRevealSalt] = useState<string>('');

  // Create Proposal Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newCategory, setNewCategory] = useState('Ecosystem Grants');

  // Conviction Stake State
  const [convictionStake, setConvictionStake] = useState<number>(50);
  const [convictionScore, setConvictionScore] = useState<number>(3420);

  const openCommitModal = (prop: ProposalItem, override = false) => {
    setCommitModalProp(prop);
    setIsOverrideMode(override);
    setBlindingSalt(generateBlindingSalt());
    setVoteCredits(Math.min(100, currentPersona.credits));
  };

  const openRevealModal = (prop: ProposalItem) => {
    setRevealModalProp(prop);
    const saved = localStorage.getItem(`axiom_vote_${prop.id}_${currentPersona.address}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRevealChoice(parsed.choice);
        setRevealCredits(parsed.credits);
        setRevealSalt(parsed.salt);
      } catch (e) {}
    } else {
      setRevealSalt('');
    }
  };

  const handleExecuteCommit = () => {
    if (!commitModalProp) return;
    if (voteCredits <= 0 || voteCredits > currentPersona.credits) {
      notify(`Invalid credits. You have ${currentPersona.credits} credits.`, 'error');
      return;
    }
    if (!blindingSalt) {
      notify('Blinding salt required for secret ballot commitment.', 'error');
      return;
    }

    const commitment = computeCommitment(commitModalProp.id, currentPersona.address, voteChoice, voteCredits, blindingSalt);

    localStorage.setItem(
      `axiom_vote_${commitModalProp.id}_${currentPersona.address}`,
      JSON.stringify({ choice: voteChoice, credits: voteCredits, salt: blindingSalt, commitment })
    );

    setProposals((prev) =>
      prev.map((p) =>
        p.id === commitModalProp.id
          ? {
              ...p,
              userCommitment: commitment,
              overriddenCount: isOverrideMode ? (p.overriddenCount || 0) + 1 : p.overriddenCount,
            }
          : p
      )
    );

    if (isOverrideMode) {
      notify(`MACI Anti-Coercion Triggered! Prior coerced ballot nullified with fresh secret commitment.`, 'info');
    } else {
      notify(`Secret ballot committed! On-chain commitment: ${commitment.slice(0, 10)}...${commitment.slice(-6)}`);
    }
    setCommitModalProp(null);
  };

  const handleExecuteReveal = () => {
    if (!revealModalProp) return;
    if (!revealSalt) {
      notify('Blinding salt is required to reveal ballot.', 'error');
      return;
    }

    const expected = computeCommitment(revealModalProp.id, currentPersona.address, revealChoice, revealCredits, revealSalt);
    const saved = localStorage.getItem(`axiom_vote_${revealModalProp.id}_${currentPersona.address}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.commitment && parsed.commitment !== expected) {
        notify('Commitment hash mismatch! Your salt or parameters do not match the sealed ballot.', 'error');
        return;
      }
    }

    const effectiveVotes = calculateQuadraticPower(revealCredits);

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === revealModalProp.id) {
          const isFor = revealChoice === 1;
          return {
            ...p,
            forVotesSqrt: isFor ? p.forVotesSqrt + effectiveVotes : p.forVotesSqrt,
            againstVotesSqrt: !isFor ? p.againstVotesSqrt + effectiveVotes : p.againstVotesSqrt,
            totalRawCredits: p.totalRawCredits + revealCredits,
            userRevealed: true,
          };
        }
        return p;
      })
    );

    notify(`Vote revealed! Quadratic power applied: √(${revealCredits}) = ${effectiveVotes} votes.`);
    setRevealModalProp(null);
  };

  const handleCreateProposal = () => {
    if (!newTitle.trim()) {
      notify('Proposal title required', 'error');
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000) + timeOffset;
    const newProp: ProposalItem = {
      id: proposals.length + 1,
      title: newTitle,
      proposer: currentPersona.address,
      category: newCategory,
      summary: newSummary || 'Community submitted governance initiative under commit-reveal verification.',
      ipfsHash: 'ipfs://bafybeifaqxiomproposalhash' + (proposals.length + 1),
      commitEndTime: nowSec + 1800,
      revealEndTime: nowSec + 3600,
      forVotesSqrt: 0,
      againstVotesSqrt: 0,
      totalRawCredits: 0,
      state: 'CommitPhase',
      overriddenCount: 0,
    };

    setProposals([newProp, ...proposals]);
    notify(`Created Proposal AIP-${newProp.id} with Commit-Reveal schedule!`);
    setShowCreateModal(false);
    setNewTitle('');
    setNewSummary('');
  };

  const getProposalLiveState = (prop: ProposalItem) => {
    const nowSec = Math.floor(Date.now() / 1000) + timeOffset;
    if (prop.state === 'Executed') return 'Executed';
    if (nowSec <= prop.commitEndTime) return 'CommitPhase';
    if (nowSec <= prop.revealEndTime) return 'RevealPhase';
    if (prop.forVotesSqrt > prop.againstVotesSqrt) return 'Passed';
    return 'Defeated';
  };

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero & Rationale */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '850px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span className="badge badge-cyan">Anti-Collusion Layer</span>
              <span className="badge badge-emerald">Sybil-Resistant Quadratic Voting</span>
              <span className="badge badge-purple">MACI Anti-Coercion Key Rotation</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
              Verifiable Anti-Collusion Governance Engine
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Eliminates flash-loan vote buying, bribing cartels, and voter herd manipulation. By utilizing a two-phase
              <strong> Commit-Reveal cryptographic scheme</strong> combined with <strong>Quadratic Voting (Power = √Credits)</strong> and
              <strong> MACI Anti-Coercion Overwrites</strong>, ballots remain completely sealed. Even if a voter is coerced in-person,
              they can quietly override the coerced ballot with zero on-chain traceability before the reveal deadline!
            </p>
          </div>
          <button
            id="create-proposal-btn"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '12px 20px', fontSize: '0.95rem' }}
          >
            <Sparkles size={18} /> New Proposal
          </button>
        </div>

        {/* Live Mathematical Formula Banner */}
        <div style={{ marginTop: '20px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '1.2rem' }}>📐</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>Quadratic Voting & MACI Math in EVM:</div>
              <div className="mono" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                EffectiveVotes = ⌊√Tokens⌋ &nbsp;|&nbsp; 4 voters × 100 credits = 40 votes &gt; 1 whale × 400 credits = 20 votes!
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} /> MACI Coercion Resistance: Active
          </div>
        </div>
      </div>

      {/* Proposals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {proposals.map((prop) => {
          const liveState = getProposalLiveState(prop);
          const totalSqrt = prop.forVotesSqrt + prop.againstVotesSqrt;
          const forPct = totalSqrt > 0 ? Math.round((prop.forVotesSqrt / totalSqrt) * 100) : 50;
          const hasCommitted = !!prop.userCommitment;
          const hasRevealed = !!prop.userRevealed;

          return (
            <div key={prop.id} className="glass-card glass-card-interactive" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Header info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="mono" style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>AIP-{prop.id}</span>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{prop.category}</span>
                  </div>

                  {liveState === 'CommitPhase' && (
                    <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Lock size={12} /> Commit Phase
                    </span>
                  )}
                  {liveState === 'RevealPhase' && (
                    <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Unlock size={12} /> Reveal Phase
                    </span>
                  )}
                  {liveState === 'Passed' && <span className="badge badge-emerald">Passed</span>}
                  {liveState === 'Executed' && <span className="badge badge-emerald">Executed</span>}
                  {liveState === 'Defeated' && <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>Defeated</span>}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', lineHeight: '1.4' }}>
                  {prop.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '18px' }}>
                  {prop.summary}
                </p>

                {/* Secret Ballot Status Banner */}
                {liveState === 'CommitPhase' && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.8rem', color: '#fde68a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
                      <ShieldAlert size={15} /> Sealed Secret Ballot
                    </div>
                    Tally is cryptographically hidden until Reveal Phase. Commit your vote with a salt blinding factor.
                    {prop.overriddenCount ? (
                      <div style={{ marginTop: '6px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <KeyRound size={13} /> MACI Anti-Coercion: Overridden {prop.overriddenCount} time(s)
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Quadratic Votes Tally Bar */}
                {liveState !== 'CommitPhase' && (
                  <div style={{ marginBottom: '18px', background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>For: {prop.forVotesSqrt} √votes</span>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>Against: {prop.againstVotesSqrt} √votes</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${forPct}%`, background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)', transition: 'width 0.5s ease' }}></div>
                      <div style={{ width: `${100 - forPct}%`, background: 'linear-gradient(90deg, #e11d48 0%, #f43f5e 100%)', transition: 'width 0.5s ease' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                      <span>Quadratic Consensus: {forPct}%</span>
                      <span>Raw Credits Spent: {prop.totalRawCredits}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Proposer: {prop.proposer.slice(0, 6)}...{prop.proposer.slice(-4)}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {liveState === 'CommitPhase' && (
                    <>
                      <button
                        id={`commit-btn-${prop.id}`}
                        className="btn btn-primary"
                        onClick={() => openCommitModal(prop, false)}
                        style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                      >
                        <Lock size={14} /> {hasCommitted ? 'Update Commit' : 'Commit Ballot'}
                      </button>

                      {hasCommitted && (
                        <button
                          id={`override-maci-btn-${prop.id}`}
                          className="btn btn-secondary"
                          onClick={() => openCommitModal(prop, true)}
                          style={{ fontSize: '0.8rem', padding: '8px 10px', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                          title="MACI Anti-Coercion: quietly replace a coerced ballot with a fresh choice"
                        >
                          <RefreshCw size={13} /> MACI Override
                        </button>
                      )}
                    </>
                  )}

                  {liveState === 'RevealPhase' && (
                    <button
                      id={`reveal-btn-${prop.id}`}
                      className="btn btn-emerald"
                      onClick={() => openRevealModal(prop)}
                      disabled={hasRevealed}
                      style={{ fontSize: '0.85rem', padding: '8px 14px', opacity: hasRevealed ? 0.6 : 1 }}
                    >
                      <Unlock size={14} /> {hasRevealed ? 'Ballot Revealed' : 'Reveal Secret Vote'}
                    </button>
                  )}

                  {liveState === 'Passed' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setProposals((prev) => prev.map((p) => p.id === prop.id ? { ...p, state: 'Executed' } : p));
                        notify(`Proposal AIP-${prop.id} executed on-chain!`);
                      }}
                      style={{ fontSize: '0.85rem', padding: '8px 14px', borderColor: '#10b981', color: '#34d399' }}
                    >
                      Execute Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conviction Signaling Live Visualizer */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#38bdf8" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Continuous Conviction Signaling Engine</h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
              Conviction increases asymptotically over time as governance participants keep tokens staked, reflecting persistent preference without discrete voting deadlines.
            </p>
          </div>
          <div className="badge badge-cyan" style={{ fontSize: '0.85rem' }}>
            Accumulated Conviction: {convictionScore}
          </div>
        </div>

        <div style={{ background: 'rgba(11, 17, 32, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Decentralized Storage Node Subsidies Initiative</span>
            <span className="mono" style={{ color: '#38bdf8', fontSize: '0.85rem' }}>Staked: {convictionStake} Credits</span>
          </div>

          <input
            type="range"
            min="10"
            max="300"
            value={convictionStake}
            onChange={(e) => {
              const val = Number(e.target.value);
              setConvictionStake(val);
              setConvictionScore(Math.floor(val * 48.5));
            }}
            style={{ width: '100%', accentColor: '#38bdf8', height: '6px', cursor: 'pointer', marginBottom: '12px' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
            <span>Conviction Decay Rate: α = 0.95</span>
            <span>Threshold for Autonomous Grant Release: 5,000 Conviction</span>
          </div>
        </div>
      </div>

      {/* COMMIT / MACI OVERRIDE BALLOT MODAL */}
      {commitModalProp && (
        <div className="modal-overlay" onClick={() => setCommitModalProp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {isOverrideMode ? 'MACI Anti-Coercion Ballot Overwrite' : 'Commit Secret Ballot'}
                </h3>
              </div>
              <button onClick={() => setCommitModalProp(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {isOverrideMode && (
              <div style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.825rem', color: '#e9d5ff' }}>
                <strong>MACI Guarantee:</strong> If someone bribed or coerced your previous ballot, submit your authentic vote now with a new blinding salt. The smart contract overwrites your commitment with zero on-chain leakage!
              </div>
            )}

            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '18px' }}>
              Proposal: <strong style={{ color: '#f8fafc' }}>AIP-{commitModalProp.id}: {commitModalProp.title}</strong>
            </div>

            {/* Vote Choice */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Vote Choice</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[
                  { id: 1, label: 'For', color: '#10b981' },
                  { id: 0, label: 'Against', color: '#f43f5e' },
                  { id: 2, label: 'Abstain', color: '#94a3b8' },
                ].map((c) => (
                  <button
                    key={c.id}
                    id={`choice-btn-${c.id}`}
                    type="button"
                    onClick={() => setVoteChoice(c.id)}
                    style={{
                      background: voteChoice === c.id ? `rgba(56, 189, 248, 0.2)` : 'rgba(15, 23, 42, 0.6)',
                      border: voteChoice === c.id ? `2px solid ${c.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                      color: voteChoice === c.id ? '#ffffff' : '#94a3b8',
                      padding: '10px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit Allocation */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Governance Credits to Allocate</label>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Available: {currentPersona.credits} credits</span>
              </div>
              <input
                id="credits-input"
                className="input-field"
                type="number"
                min="1"
                max={currentPersona.credits}
                value={voteCredits}
                onChange={(e) => setVoteCredits(Number(e.target.value))}
              />
              <div style={{ marginTop: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Quadratic Vote Weight:</span>
                <strong style={{ color: '#38bdf8' }}>√({voteCredits}) = {calculateQuadraticPower(voteCredits)} effective votes</strong>
              </div>
            </div>

            {/* Blinding Salt Generator */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cryptographic Blinding Salt (32-byte hex)</label>
                <button
                  type="button"
                  onClick={() => setBlindingSalt(generateBlindingSalt())}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Sparkles size={12} /> Regenerate
                </button>
              </div>
              <input
                className="input-field mono"
                style={{ fontSize: '0.78rem' }}
                value={blindingSalt}
                onChange={(e) => setBlindingSalt(e.target.value)}
              />
            </div>

            {/* Computed Commitment Hash Preview */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.8rem' }}>
              <div style={{ color: '#64748b', marginBottom: '4px' }}>On-Chain Commitment Hash (Sealed Ballot):</div>
              <div className="mono" style={{ color: '#34d399', wordBreak: 'break-all' }}>
                {computeCommitment(commitModalProp.id, currentPersona.address, voteChoice, voteCredits, blindingSalt || '0x00')}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setCommitModalProp(null)}>Cancel</button>
              <button id="submit-commit-btn" className="btn btn-primary" onClick={handleExecuteCommit}>
                <Lock size={16} /> {isOverrideMode ? 'Execute MACI Overwrite' : 'Seal & Commit Ballot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVEAL BALLOT MODAL */}
      {revealModalProp && (
        <div className="modal-overlay" onClick={() => setRevealModalProp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Unlock size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reveal Secret Ballot</h3>
              </div>
              <button onClick={() => setRevealModalProp(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '18px' }}>
              Unsealing vote for: <strong style={{ color: '#f8fafc' }}>AIP-{revealModalProp.id}</strong>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Revealed Choice</label>
              <select
                className="input-field"
                value={revealChoice}
                onChange={(e) => setRevealChoice(Number(e.target.value))}
              >
                <option value={1}>For</option>
                <option value={0}>Against</option>
                <option value={2}>Abstain</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Credits Committed</label>
              <input
                className="input-field"
                type="number"
                value={revealCredits}
                onChange={(e) => setRevealCredits(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Blinding Salt</label>
              <input
                className="input-field mono"
                style={{ fontSize: '0.78rem' }}
                placeholder="0x..."
                value={revealSalt}
                onChange={(e) => setRevealSalt(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setRevealModalProp(null)}>Cancel</button>
              <button id="submit-reveal-btn" className="btn btn-emerald" onClick={handleExecuteReveal}>
                <Unlock size={16} /> Reveal Vote & Apply QV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROPOSAL MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Submit Anti-Collusion Proposal</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Proposal Title</label>
              <input
                id="prop-title-input"
                className="input-field"
                placeholder="e.g. AIP-4: Deploy Verifiable ZK Rollup Bridge"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Category</label>
              <select
                className="input-field"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="Governance Protocol">Governance Protocol</option>
                <option value="Treasury & Grants">Treasury & Grants</option>
                <option value="Contributor Guild">Contributor Guild</option>
                <option value="Security & Audits">Security & Audits</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Proposal Abstract</label>
              <textarea
                id="prop-summary-input"
                className="input-field"
                rows={4}
                placeholder="Detail the technical implementation, resource allocation, and milestones..."
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button id="create-proposal-submit-btn" className="btn btn-primary" onClick={handleCreateProposal}>
                Deploy Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
