import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { type ProjectItem, type BountyItem, type ExpensePoolItem, INITIAL_PROJECTS, INITIAL_BOUNTIES, INITIAL_EXPENSE_POOLS } from '../lib/mockData';
import { ShieldCheck, CheckCircle2, UploadCloud, ArrowUpRight, Users, DollarSign, Receipt } from 'lucide-react';

export const BountyEscrowView: React.FC = () => {
  const { currentPersona, notify } = useWeb3();
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [bounties, setBounties] = useState<BountyItem[]>(INITIAL_BOUNTIES);
  const [expensePools, setExpensePools] = useState<ExpensePoolItem[]>(INITIAL_EXPENSE_POOLS);

  // Deliverable Submission Modal
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [activeMilestoneIdx, setActiveMilestoneIdx] = useState<number | null>(null);
  const [deliverableHash, setDeliverableHash] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');

  // New Project Modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newContributor, setNewContributor] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [newFunding, setNewFunding] = useState('4.0');

  // New Expense Pool Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('2.0');
  const [expenseReceipt, setExpenseReceipt] = useState('ipfs://bafybeireceiptsinvoices');

  // Streaming Payroll Simulator
  const [streamAccrued, setStreamAccrued] = useState<number>(1.2458);
  const ratePerSec = 0.00005;

  useEffect(() => {
    const timer = setInterval(() => {
      setStreamAccrued((prev) => prev + ratePerSec);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmitDeliverable = () => {
    if (!activeProject || activeMilestoneIdx === null) return;
    if (!deliverableHash.trim()) {
      notify('Cryptographic deliverable hash is required (SHA-256 or IPFS CID)', 'error');
      return;
    }

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === activeProject.id) {
          const updatedMilestones = [...proj.milestones];
          updatedMilestones[activeMilestoneIdx] = {
            ...updatedMilestones[activeMilestoneIdx],
            status: 'Submitted',
            deliverableHash: deliverableHash,
            notes: deliverableNotes || 'Delivered cryptographic proof of work to on-chain escrow.',
          };
          return { ...proj, milestones: updatedMilestones };
        }
        return proj;
      })
    );

    notify(`Milestone deliverable submitted! Proof hash: ${deliverableHash.slice(0, 16)}...`);
    setActiveProject(null);
    setActiveMilestoneIdx(null);
    setDeliverableHash('');
    setDeliverableNotes('');
  };

  const handleApproveMilestone = (project: ProjectItem, mIdx: number) => {
    const milestone = project.milestones[mIdx];
    const amountVal = parseFloat(milestone.amount);

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === project.id) {
          const updatedMilestones = [...proj.milestones];
          updatedMilestones[mIdx] = {
            ...updatedMilestones[mIdx],
            status: 'Released',
          };
          const currentRem = parseFloat(proj.remainingFunds);
          const newRem = Math.max(0, currentRem - amountVal).toFixed(1) + ' ETH';
          return { ...proj, remainingFunds: newRem, milestones: updatedMilestones };
        }
        return proj;
      })
    );

    notify(`Milestone approved! Released ${milestone.amount} to contributor ${project.contributor.slice(0, 6)}...`);
  };

  const handleDisburseExpense = (poolId: number) => {
    setExpensePools((prev) =>
      prev.map((pool) =>
        pool.id === poolId ? { ...pool, approved: true, disbursed: true } : pool
      )
    );
    notify(`Expense pool #${poolId} disbursed automatically to all payees according to agreed shares!`);
  };

  const handleCreateExpensePool = () => {
    if (!expenseTitle.trim()) {
      notify('Expense title required', 'error');
      return;
    }

    const newPool: ExpensePoolItem = {
      id: expensePools.length + 1,
      title: expenseTitle,
      creator: currentPersona.address,
      receiptHash: expenseReceipt,
      totalFunded: `${expenseAmount} ETH`,
      payees: [
        { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', name: 'Bob Martinez', shareBps: 6000, amount: `${parseFloat(expenseAmount) * 0.6} ETH` },
        { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'Charlie Lin', shareBps: 4000, amount: `${parseFloat(expenseAmount) * 0.4} ETH` },
      ],
      approved: false,
      disbursed: false,
    };

    setExpensePools([newPool, ...expensePools]);
    notify(`Created Multi-Party Expense Pool #${newPool.id} with verified receipts!`);
    setShowExpenseModal(false);
    setExpenseTitle('');
  };

  const handleClaimBounty = (bountyId: number) => {
    setBounties((prev) =>
      prev.map((b) => (b.id === bountyId ? { ...b, status: 'Claimed', claimant: currentPersona.address } : b))
    );
    notify(`Bounty claimed by ${currentPersona.name}!`);
  };

  const handleSubmitBounty = (bountyId: number) => {
    const mockProof = 'ipfs://bafybeicontributorbountyproof' + Date.now();
    setBounties((prev) =>
      prev.map((b) => (b.id === bountyId ? { ...b, status: 'Submitted', submissionHash: mockProof } : b))
    );
    notify(`Submitted bounty deliverable hash: ${mockProof.slice(0, 20)}...`);
  };

  const handleApproveBounty = (bountyId: number, reward: string) => {
    setBounties((prev) =>
      prev.map((b) => (b.id === bountyId ? { ...b, status: 'Completed' } : b))
    );
    notify(`Bounty approved! Transferred ${reward} reward directly to claimant.`);
  };

  const handleWithdrawStream = () => {
    notify(`Withdrew ${streamAccrued.toFixed(4)} ETH from continuous streaming salary!`);
    setStreamAccrued(0.001);
  };

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Overview Banner */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-cyan">Trustless Collaboration</span>
              <span className="badge badge-emerald">Milestone-Locked Escrow</span>
              <span className="badge badge-purple">Multi-Party Expense Sharing</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '10px' }}>
              Decentralized Milestone Escrow & Contributor Workflows
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '850px', lineHeight: '1.6' }}>
              Replace centralized SaaS payroll and untracked Discord agreements with tamper-resistant smart contracts.
              Includes milestone escrow with cryptographic deliverable hashing, real-time continuous streaming payroll,
              and multi-party shared expense splits with verified invoices.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="create-expense-pool-btn"
              className="btn btn-secondary"
              onClick={() => setShowExpenseModal(true)}
            >
              <Receipt size={16} /> Shared Expense Pool
            </button>
            <button
              id="create-milestone-project-btn"
              className="btn btn-primary"
              onClick={() => setShowNewProjectModal(true)}
            >
              <ShieldCheck size={18} /> New Milestone Project
            </button>
          </div>
        </div>
      </div>

      {/* Streaming Payroll Real-Time Ticker */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', background: 'linear-gradient(135deg, rgba(18, 18, 22, 0.95) 0%, rgba(26, 26, 32, 0.7) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)' }}></span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7', textTransform: 'uppercase' }}>Active Streaming Payroll</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Continuous Salary Stream: 0xresearcher.eth (Core Protocol Research)
            </div>
            <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '2px' }}>
              Funded by DAO Treasury • Rate: 0.18 ETH / hour (linear per-second unlock)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Accrued & Claimable:</div>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>
                {streamAccrued.toFixed(5)} ETH
              </div>
            </div>
            <button
              id="withdraw-stream-btn"
              className="btn btn-emerald"
              onClick={handleWithdrawStream}
              style={{ padding: '10px 18px' }}
            >
              <ArrowUpRight size={16} /> Withdraw Stream
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Party Expense Pools Section (Track 3 Requirement) */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#f4f4f5" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Multi-Party Expense Sharing Pools</h3>
            </div>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '2px' }}>
              Trustless collaborative reimbursement: working groups submit receipts, and contract automatically splits funds across payees upon multi-sig approval.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          {expensePools.map((pool) => (
            <div
              key={pool.id}
              style={{
                background: 'rgba(18, 18, 22, 0.8)',
                border: `1px solid ${pool.disbursed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: '10px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.75rem', color: '#71717a' }}>POOL #{pool.id}</span>
                  {pool.disbursed ? (
                    <span className="badge badge-emerald">Disbursed</span>
                  ) : (
                    <span className="badge badge-amber">Awaiting Approval</span>
                  )}
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{pool.title}</h4>
                <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f5', marginBottom: '10px' }}>
                  Total: {pool.totalFunded}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '12px' }}>
                  <span style={{ color: '#71717a' }}>Receipts Hash: </span>
                  <span className="mono" style={{ color: '#e4e4e7' }}>{pool.receiptHash.slice(0, 24)}...</span>
                </div>

                <div style={{ fontSize: '0.8rem', marginBottom: '14px' }}>
                  <div style={{ color: '#a1a1aa', fontWeight: 600, marginBottom: '6px' }}>Payee Pro-Rata Split:</div>
                  {pool.payees.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                      <span style={{ color: '#d4d4d8' }}>{p.name}</span>
                      <span className="mono" style={{ color: '#4ade80', fontWeight: 600 }}>{p.amount} ({p.shareBps / 100}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                {!pool.disbursed ? (
                  <button
                    id={`disburse-expense-btn-${pool.id}`}
                    className="btn btn-emerald"
                    onClick={() => handleDisburseExpense(pool.id)}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    <DollarSign size={14} /> Approve & Disburse Split
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Funds Split Directly to Wallets
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Projects Section */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📦</span> Milestone-Based Escrow Projects
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
        {projects.map((proj) => (
          <div key={proj.id} className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span className="mono" style={{ color: '#f4f4f5', fontWeight: 700 }}>Project #{proj.id}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{proj.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                  <span>Client: <strong style={{ color: '#f8fafc' }}>{proj.client.slice(0, 6)}...{proj.client.slice(-4)}</strong></span>
                  <span>Contributor: <strong style={{ color: '#f4f4f5' }}>{proj.contributor.slice(0, 6)}...{proj.contributor.slice(-4)}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Escrow Balance:</div>
                  <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                    {proj.remainingFunds} / {proj.totalFunded}
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones Horizontal Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {proj.milestones.map((m, idx) => {
                const isReleased = m.status === 'Released';
                const isSubmitted = m.status === 'Submitted';
                const isInProgress = m.status === 'InProgress';

                return (
                  <div
                    key={idx}
                    style={{
                      background: isReleased ? 'rgba(34, 197, 94, 0.05)' : isSubmitted ? 'rgba(255, 255, 255, 0.05)' : 'rgba(18, 18, 22, 0.7)',
                      border: `1px solid ${isReleased ? 'rgba(34, 197, 94, 0.3)' : isSubmitted ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a' }}>MILESTONE {idx + 1}</span>
                        {isReleased && <span className="badge badge-emerald">Released</span>}
                        {isSubmitted && <span className="badge badge-neutral">Submitted</span>}
                        {isInProgress && <span className="badge badge-amber">In Progress</span>}
                        {m.status === 'Pending' && <span className="badge badge-neutral">Pending</span>}
                      </div>

                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>{m.title}</h4>
                      <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
                        {m.amount}
                      </div>

                      {m.deliverableHash && (
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.72rem', marginBottom: '8px' }}>
                          <span style={{ color: '#71717a' }}>Proof Hash: </span>
                          <span className="mono" style={{ color: '#4ade80' }}>{m.deliverableHash.slice(0, 16)}...</span>
                        </div>
                      )}

                      {m.notes && (
                        <p style={{ fontSize: '0.75rem', color: '#a1a1aa', fontStyle: 'italic', marginBottom: '8px' }}>
                          "{m.notes}"
                        </p>
                      )}
                    </div>

                    <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', color: '#71717a' }}>Due: {m.deadline}</span>

                      {(m.status === 'Pending' || isInProgress) && (
                        <button
                          id={`submit-milestone-${proj.id}-${idx}`}
                          className="btn btn-secondary"
                          onClick={() => {
                            setActiveProject(proj);
                            setActiveMilestoneIdx(idx);
                          }}
                          style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        >
                          <UploadCloud size={13} /> Submit Proof
                        </button>
                      )}

                      {isSubmitted && (
                        <button
                          id={`approve-milestone-${proj.id}-${idx}`}
                          className="btn btn-emerald"
                          onClick={() => handleApproveMilestone(proj, idx)}
                          style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        >
                          <CheckCircle2 size={13} /> Approve & Release
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Role-Based Task Bounties Section */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🎯</span> Role-Gated Task Bounties
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {bounties.map((b) => (
          <div key={b.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="badge badge-neutral">{b.requiredRole}</span>
                {b.status === 'Open' && <span className="badge badge-neutral">Open</span>}
                {b.status === 'Claimed' && <span className="badge badge-amber">Claimed</span>}
                {b.status === 'Submitted' && <span className="badge badge-neutral">Proof Submitted</span>}
                {b.status === 'Completed' && <span className="badge badge-emerald">Completed</span>}
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{b.title}</h4>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f5', marginBottom: '12px' }}>
                {b.rewardAmount}
              </div>

              {b.submissionHash && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Submission CID: </span>
                  <span className="mono" style={{ color: '#34d399' }}>{b.submissionHash.slice(0, 20)}...</span>
                </div>
              )}
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Expires: {b.deadline}</span>

              {b.status === 'Open' && (
                <button
                  id={`claim-bounty-${b.id}`}
                  className="btn btn-primary"
                  onClick={() => handleClaimBounty(b.id)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Claim Task
                </button>
              )}

              {b.status === 'Claimed' && (
                <button
                  id={`submit-bounty-${b.id}`}
                  className="btn btn-secondary"
                  onClick={() => handleSubmitBounty(b.id)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Submit Deliverable
                </button>
              )}

              {b.status === 'Submitted' && (
                <button
                  id={`approve-bounty-${b.id}`}
                  className="btn btn-emerald"
                  onClick={() => handleApproveBounty(b.id, b.rewardAmount)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Approve Payout
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE EXPENSE POOL MODAL */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="#f4f4f5" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create Shared Expense Pool</h3>
              </div>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Expense Pool Title</label>
              <input
                id="expense-title-input"
                className="input-field"
                placeholder="e.g. ZK Paris Workshop & Cloud Compute Cluster"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Total Escrow Reimbursement (ETH)</label>
              <input
                id="expense-amount-input"
                className="input-field"
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Receipts / Invoices Hash (IPFS or SHA-256)</label>
              <input
                id="expense-receipt-input"
                className="input-field mono"
                value={expenseReceipt}
                onChange={(e) => setExpenseReceipt(e.target.value)}
              />
            </div>

            <div style={{ background: 'rgba(18, 18, 22, 0.8)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem' }}>
              <div style={{ color: '#a1a1aa', fontWeight: 600, marginBottom: '4px' }}>Automated Payee Distribution:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d4d4d8' }}>
                <span>0xresearcher.eth (60% share)</span>
                <span className="mono" style={{ color: '#f4f4f5' }}>{parseFloat(expenseAmount || '0') * 0.6} ETH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d4d4d8', marginTop: '4px' }}>
                <span>auditor-charlie.eth (40% share)</span>
                <span className="mono" style={{ color: '#f4f4f5' }}>{parseFloat(expenseAmount || '0') * 0.4} ETH</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
              <button id="confirm-expense-btn" className="btn btn-primary" onClick={handleCreateExpensePool}>
                Deposit & Fund Pool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT DELIVERABLE MODAL */}
      {activeProject && activeMilestoneIdx !== null && (
        <div className="modal-overlay" onClick={() => setActiveProject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={20} color="#f4f4f5" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Submit Milestone Deliverable</h3>
              </div>
              <button onClick={() => setActiveProject(null)} style={{ background: 'transparent', border: 'none', color: '#71717a', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '16px' }}>
              Submitting for: <strong style={{ color: '#f8fafc' }}>{activeProject.milestones[activeMilestoneIdx].title}</strong> ({activeProject.milestones[activeMilestoneIdx].amount})
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Cryptographic Deliverable Hash (SHA-256 / IPFS CID / Git SHA)
              </label>
              <input
                id="deliverable-hash-input"
                className="input-field mono"
                placeholder="sha256:7f83b1657ff1fc53b92dc... or ipfs://Qm..."
                value={deliverableHash}
                onChange={(e) => setDeliverableHash(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setDeliverableHash('sha256:' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''))}
                style={{ background: 'transparent', border: 'none', color: '#f4f4f5', fontSize: '0.75rem', cursor: 'pointer', marginTop: '4px' }}
              >
                + Auto-generate mock SHA-256 deliverable hash
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Delivery Summary & Verification Notes
              </label>
              <textarea
                id="deliverable-notes-input"
                className="input-field"
                rows={3}
                placeholder="Include link to reproducibility repo, test suite coverage report, or benchmark data..."
                value={deliverableNotes}
                onChange={(e) => setDeliverableNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setActiveProject(null)}>Cancel</button>
              <button id="confirm-deliverable-btn" className="btn btn-primary" onClick={handleSubmitDeliverable}>
                Submit to Escrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create Milestone Escrow Project</h3>
              <button onClick={() => setShowNewProjectModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Project Title</label>
              <input
                className="input-field"
                placeholder="e.g. ZK Proof Aggregation Engine"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Contributor Address</label>
              <input
                className="input-field mono"
                value={newContributor}
                onChange={(e) => setNewContributor(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Escrow Funding (ETH)</label>
              <input
                className="input-field"
                type="number"
                value={newFunding}
                onChange={(e) => setNewFunding(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowNewProjectModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!newProjectTitle.trim()) {
                    notify('Project title required', 'error');
                    return;
                  }
                  const newProj: ProjectItem = {
                    id: projects.length + 1,
                    title: newProjectTitle,
                    client: currentPersona.address,
                    contributor: newContributor,
                    totalFunded: `${newFunding} ETH`,
                    remainingFunds: `${newFunding} ETH`,
                    milestones: [
                      { title: 'Milestone 1: Prototype Implementation', amount: `${parseFloat(newFunding)/2} ETH`, deadline: '2026-10-15', status: 'Pending' },
                      { title: 'Milestone 2: Production Benchmark & Audit', amount: `${parseFloat(newFunding)/2} ETH`, deadline: '2026-11-01', status: 'Pending' },
                    ],
                  };
                  setProjects([newProj, ...projects]);
                  notify(`Created milestone project #${newProj.id} with ${newFunding} ETH escrowed!`);
                  setShowNewProjectModal(false);
                }}
              >
                Deposit & Deploy Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
