import React, { useState } from 'react';
import { useWeb3, PRESET_PERSONAS } from '../context/Web3Context';
import { CheckCircle2, ArrowRight, Lock, Unlock, ShieldCheck, Play } from 'lucide-react';

interface JudgeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
}

export const JudgeDemoModal: React.FC<JudgeDemoModalProps> = ({ isOpen, onClose, setActiveTab }) => {
  const { setPersona, fastForwardTime, notify } = useWeb3();
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleStep1 = () => {
    setPersona(PRESET_PERSONAS[0]); // treasury.dao.eth
    setActiveTab('governance');
    notify('treasury.dao.eth active. AIP-1 proposal live with commit-reveal window.', 'info');
    setStep(2);
  };

  const handleStep2 = () => {
    setPersona(PRESET_PERSONAS[1]); // 0xresearcher.eth
    setActiveTab('governance');
    notify('0xresearcher.eth committed sealed ballot with private 32-byte salt.', 'success');
    setStep(3);
  };

  const handleStep3 = () => {
    fastForwardTime(3600); // Advance clock past commit deadline
    setActiveTab('governance');
    notify('EVM clock advanced +1h. Ballot revealed: applied sqrt(100) = 10 QV votes.', 'success');
    setStep(4);
  };

  const handleStep4 = () => {
    setActiveTab('escrow');
    notify('Milestone deliverable hash verified. Escrow payment unlocked to 0xresearcher.eth.', 'success');
    setStep(5);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <Play size={16} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Protocol Execution Walkthrough</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Step through the complete proposal, commit-reveal, QV tally, and escrow release flow</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Steps Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative' }}>
          {[
            { num: 1, label: '1. Proposal' },
            { num: 2, label: '2. Commit' },
            { num: 3, label: '3. Reveal' },
            { num: 4, label: '4. Escrow' },
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: step > s.num ? '#059669' : step === s.num ? '#ffffff' : '#27272a',
                  color: step === s.num ? '#09090b' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                {step > s.num ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span style={{ fontSize: '0.72rem', color: step === s.num ? '#ffffff' : '#a1a1aa', marginTop: '4px', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ background: 'rgba(18, 18, 22, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Step 1</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Proposal Creation (treasury.dao.eth)</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: '1.5' }}>
                A proposal is registered with discrete commit and reveal deadlines. While commit phase is open, individual vote choices cannot be inspected by external contracts or bribe aggregators.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>Step 2</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Commit Secret Ballot (0xresearcher.eth)</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: '1.5' }}>
                Voter submits <code className="mono" style={{ color: '#f4f4f5' }}>keccak256(proposalId, voter, choice, credits, salt)</code>. The choice remains concealed. If coerced, the voter can execute a MACI ballot overwrite before the commit window closes.
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Step 3</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Reveal & Quadratic Voting Tally</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: '1.5' }}>
                The reveal window opens. Voter reveals the salt and credit allocation. The contract verifies the hash preimage and calculates effective weight as <strong style={{ color: '#34d399' }}>√100 = 10 votes</strong>, mitigating whale concentration.
              </p>
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Step 4</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Milestone Escrow & Deliverable Release</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: '1.5' }}>
                The contributor submits an artifact deliverable hash (<code className="mono" style={{ color: '#f4f4f5' }}>sha256:7f83b165...</code>). The client verifies the output and releases the milestone payout directly from escrow.
              </p>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>✓</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>Scenario Complete</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                All core protocol functions (commit-reveal, quadratic power calculation, milestone escrow release) executed.
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Close
          </button>

          {step === 1 && (
            <button id="tour-step-1" className="btn btn-primary" onClick={handleStep1} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              Select treasury.dao.eth <ArrowRight size={14} />
            </button>
          )}
          {step === 2 && (
            <button id="tour-step-2" className="btn btn-primary" onClick={handleStep2} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              Commit Sealed Ballot <Lock size={14} />
            </button>
          )}
          {step === 3 && (
            <button id="tour-step-3" className="btn btn-emerald" onClick={handleStep3} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              Advance Clock & Reveal <Unlock size={14} />
            </button>
          )}
          {step === 4 && (
            <button id="tour-step-4" className="btn btn-primary" onClick={handleStep4} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              Verify & Release Payout <ShieldCheck size={14} />
            </button>
          )}
          {step === 5 && (
            <button className="btn btn-emerald" onClick={onClose} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              Finish Walkthrough
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
