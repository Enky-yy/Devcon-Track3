import { ethers } from 'ethers';
import { buildMerkleTree } from './crypto';

export interface ProposalItem {
  id: number;
  title: string;
  proposer: string;
  category: string;
  summary: string;
  ipfsHash: string;
  commitEndTime: number;
  revealEndTime: number;
  forVotesSqrt: number;
  againstVotesSqrt: number;
  totalRawCredits: number;
  state: 'CommitPhase' | 'RevealPhase' | 'Passed' | 'Executed' | 'Defeated';
  userCommitment?: string;
  userRevealed?: boolean;
  overriddenCount?: number;
}

export interface MilestoneItem {
  title: string;
  amount: string;
  deadline: string;
  status: 'Pending' | 'InProgress' | 'Submitted' | 'Approved' | 'Released';
  deliverableHash?: string;
  notes?: string;
}

export interface ProjectItem {
  id: number;
  title: string;
  client: string;
  contributor: string;
  totalFunded: string;
  remainingFunds: string;
  milestones: MilestoneItem[];
}

export interface ExpensePoolItem {
  id: number;
  title: string;
  creator: string;
  receiptHash: string;
  totalFunded: string;
  payees: { address: string; name: string; shareBps: number; amount: string }[];
  approved: boolean;
  disbursed: boolean;
}

export interface BountyItem {
  id: number;
  title: string;
  creator: string;
  claimant?: string;
  requiredRole: string;
  rewardAmount: string;
  deadline: string;
  status: 'Open' | 'Claimed' | 'Submitted' | 'Completed';
  submissionHash?: string;
}

export interface ArtifactItem {
  artifactHash: string;
  parentHash: string;
  version: number;
  title: string;
  author: string;
  authorName: string;
  metadataURI: string;
  timestamp: string;
  attestations: {
    signer: string;
    signerName: string;
    role: string;
    statement: string;
    timestamp: string;
  }[];
}

export interface KeylessAttestationItem {
  deliverableHash: string;
  issuer: string;
  identityClaim: string;
  role: string;
  relayer: string;
  timestamp: string;
  verified: boolean;
}

const NOW = Math.floor(Date.now() / 1000);

export const INITIAL_PROPOSALS: ProposalItem[] = [
  {
    id: 1,
    title: 'AIP-1: L2 Sequencer Decentralization & Prover Grant Matching Pool',
    proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    category: 'Ecosystem Grants',
    summary: 'Allocate 120,000 DAI into a quadratic matching pool for independent prover teams building open-source shared sequencing client implementations.',
    ipfsHash: 'ipfs://bafybeicg2u4q4t4g3l3k6h5o2v5u5l4h3l3k6h5o2v5u5',
    commitEndTime: NOW + 3600,
    revealEndTime: NOW + 7200,
    forVotesSqrt: 0,
    againstVotesSqrt: 0,
    totalRawCredits: 0,
    state: 'CommitPhase',
    overriddenCount: 0,
  },
  {
    id: 2,
    title: 'AIP-2: Commit-Reveal & MACI Enforcement for Treasury Transfers > 25 ETH',
    proposer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    category: 'Governance Protocol',
    summary: 'Mandate secret-ballot commit-reveal verification for all large capital transfers to eliminate flashloan voting attacks and public bribe cartels.',
    ipfsHash: 'ipfs://bafybeid7k3l3k6h5o2v5u5l4h3l3k6h5o2v5u5l4h3l3k',
    commitEndTime: NOW - 600,
    revealEndTime: NOW + 3600,
    forVotesSqrt: 28,
    againstVotesSqrt: 15,
    totalRawCredits: 1250,
    state: 'RevealPhase',
    overriddenCount: 1,
  },
  {
    id: 3,
    title: 'AIP-3: Contributor Streaming Payroll & Milestone Artifact Verification',
    proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    category: 'Working Groups',
    summary: 'Transition core team and research grantees from manual monthly invoices to on-chain per-second streaming escrow with cryptographic deliverable checks.',
    ipfsHash: 'ipfs://bafybeih5o2v5u5l4h3l3k6h5o2v5u5l4h3l3k6h5o2v5u',
    commitEndTime: NOW - 86400,
    revealEndTime: NOW - 43200,
    forVotesSqrt: 64,
    againstVotesSqrt: 8,
    totalRawCredits: 4200,
    state: 'Executed',
    overriddenCount: 0,
  },
];

export const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 1,
    title: 'Halo2 Circuit Fuzzing Engine & Benchmarking Suite',
    client: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    contributor: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    totalFunded: '6.0 ETH',
    remainingFunds: '3.5 ETH',
    milestones: [
      {
        title: 'M1: Architecture Spec & Fuzzing Harness Design',
        amount: '2.5 ETH',
        deadline: '2026-09-15',
        status: 'Released',
        deliverableHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        notes: 'Spec v1.0 delivered. Harness repo tagged v0.1.0 with CI integration.',
      },
      {
        title: 'M2: State Machine Differential Fuzzer & Test Vectors',
        amount: '2.0 ETH',
        deadline: '2026-10-01',
        status: 'Submitted',
        deliverableHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        notes: 'Discovered 2 edge cases in constraint gate validation. Benchmarks run in 1.4s on 16 cores.',
      },
      {
        title: 'M3: Testnet Deployment & Formal Verification Proofs',
        amount: '1.5 ETH',
        deadline: '2026-10-20',
        status: 'Pending',
      },
    ],
  },
  {
    id: 2,
    title: 'EIP-4844 Blob Gas Fee Forecaster & Rollup DA Monitoring',
    client: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    contributor: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    totalFunded: '8.0 ETH',
    remainingFunds: '8.0 ETH',
    milestones: [
      {
        title: 'M1: Mempool blob analyzer daemon and time-series estimator',
        amount: '4.0 ETH',
        deadline: '2026-10-15',
        status: 'InProgress',
      },
      {
        title: 'M2: Fallback gas pricing oracle and Grafana dashboard integration',
        amount: '4.0 ETH',
        deadline: '2026-11-01',
        status: 'Pending',
      },
    ],
  },
];

export const INITIAL_EXPENSE_POOLS: ExpensePoolItem[] = [
  {
    id: 1,
    title: 'ZK Paris Workshop Booth & GPU Benchmarking Cluster (RunPod A100s)',
    creator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    receiptHash: 'ipfs://bafybeihardwareinvoicesandbaremetalcloudreceipts',
    totalFunded: '3.0 ETH',
    payees: [
      { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', name: '0xresearcher.eth (Bob M.)', shareBps: 6500, amount: '1.95 ETH' },
      { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'auditor-charlie.eth (Charlie L.)', shareBps: 3500, amount: '1.05 ETH' },
    ],
    approved: false,
    disbursed: false,
  },
];

export const INITIAL_BOUNTIES: BountyItem[] = [
  {
    id: 1,
    title: 'Security Audit & Invariant Analysis: Commit-Reveal Quadratic Module',
    creator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    claimant: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    requiredRole: 'Security Auditor',
    rewardAmount: '2.5 ETH',
    deadline: '2026-09-18',
    status: 'Submitted',
    submissionHash: 'ipfs://bafybeie7v5u5l4h3l3k6h5o2v5u5l4h3l3k6h5o2v5u5l4h3l3k6h5o2v5',
  },
  {
    id: 2,
    title: 'WASM Prover Client for On-Chain Provenance DAG Lineage',
    creator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    requiredRole: 'Core Dev',
    rewardAmount: '1.8 ETH',
    deadline: '2026-09-25',
    status: 'Open',
  },
  {
    id: 3,
    title: 'Conviction Voting Simulation Harness for Grant Council Sizing',
    creator: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    requiredRole: 'Data Scientist',
    rewardAmount: '1.2 ETH',
    deadline: '2026-10-05',
    status: 'Open',
  },
];

export const INITIAL_ARTIFACTS: ArtifactItem[] = [
  {
    artifactHash: ethers.id('Axiom Protocol Architecture v1.0.0'),
    parentHash: ethers.ZeroHash,
    version: 1,
    title: 'Axiom Protocol Specification v1.0.0',
    author: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    authorName: 'treasury.dao.eth (Alice V.)',
    metadataURI: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    timestamp: '2026-08-10 14:20 UTC',
    attestations: [
      {
        signer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        signerName: 'auditor-charlie.eth',
        role: 'Lead Security Auditor',
        statement: 'Verified architectural threat model against frontrunning and Sybil attack vectors.',
        timestamp: '2026-08-12 18:45 UTC',
      },
    ],
  },
  {
    artifactHash: ethers.id('Axiom Protocol Architecture v2.0.0 - Anti-Collusion Model'),
    parentHash: ethers.id('Axiom Protocol Architecture v1.0.0'),
    version: 2,
    title: 'Axiom Protocol Specification v2.0.0 (Anti-Collusion & MACI Overwrites)',
    author: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    authorName: '0xresearcher.eth (Bob M.)',
    metadataURI: 'ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
    timestamp: '2026-09-02 09:15 UTC',
    attestations: [
      {
        signer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        signerName: 'treasury.dao.eth',
        role: 'Treasury Lead',
        statement: 'Approved for testnet integration and protocol upgrade.',
        timestamp: '2026-09-03 11:30 UTC',
      },
      {
        signer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        signerName: 'auditor-charlie.eth',
        role: 'Auditor Guild',
        statement: 'Formal verification of polynomial quadratic voting curves completed with 0 high-severity findings.',
        timestamp: '2026-09-04 16:00 UTC',
      },
    ],
  },
];

export const INITIAL_KEYLESS_ATTESTATIONS: KeylessAttestationItem[] = [
  {
    deliverableHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    issuer: 'https://github.com/login/oauth',
    identityClaim: 'github:user:0xresearcher-dev (GitHub Verified)',
    role: 'Lead Core Maintainer',
    relayer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    timestamp: '2026-09-05 15:30 UTC',
    verified: true,
  },
  {
    deliverableHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    issuer: 'https://accounts.google.com',
    identityClaim: 'google:charlie.lin@zk-research.org (OIDC Workspace Verified)',
    role: 'Independent Reproducibility Reviewer',
    relayer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    timestamp: '2026-09-06 09:12 UTC',
    verified: true,
  },
];

const CHECKPOINT_LEAF_ITEMS = [
  'git:commit:a4b7c89: core-contracts cancun migration',
  'git:commit:d1e2f3a: add commit-reveal quadratic engine',
  'git:commit:7b8c9d0: milestone streaming payroll escrow',
  'git:commit:3f4a5b6: eip712 typed structured provenance attestations',
];

export const INITIAL_MERKLE_TREE = buildMerkleTree(CHECKPOINT_LEAF_ITEMS);
export const INITIAL_MERKLE_LEAF_ITEMS = CHECKPOINT_LEAF_ITEMS;
