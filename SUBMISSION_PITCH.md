# Hackathon Submission: Axiom Protocol

**Track 3**: Decentralized Coordination Layers & Verifiable Governance  
**Repository**: `/home/enky-yy/Hackathon/devcon`  

---

## 1. The Core Problem

DAOs manage billions, but their daily coordination is glued together with Discord links, Google Docs, and public Snapshot tallies that are trivially easy to game:

1. **Flashloans and bribes break open governance**: When votes are public while the ballot is active, vote buyers can verify that a bribe was fulfilled before paying out. Anyone with enough capital can borrow governance tokens for one block, skew the vote, and return them.
2. **Coercion has no on-chain defense**: If an employer or attacker forces a contributor to vote a certain way, the contributor has no way to submit an alternate vote without immediately tipping off the attacker.
3. **Grant payouts are all-or-nothing**: DAOs routinely wire large sums upfront and end up chasing ghost contractors, or they depend on centralized payroll software (Deel, Gusto) that introduces bank freezes and KYC walls.
4. **Collaborative expenses are messy**: When working groups rent event booths, pay for compute clusters, or commission audits, one person pays out of pocket and waits months for a multi-sig transaction.

---

## 2. What Axiom Does

We built a modular coordination and governance framework directly on Solidity 0.8.24 (Cancun EVM):

- **Commit-Reveal Quadratic Voting (`AxiomGovernance.sol`)**:
  - Hides ballot distribution during voting with voter-generated 32-byte salts.
  - Quadratic voting formula $\lfloor\sqrt{\text{credits}}\rfloor$ calculated directly in EVM via integer square root.
  - **MACI Anti-Coercion Overwrite**: Contributor can submit an initial coerced vote to satisfy an attacker, then quietly overwrite it with their real vote before the commit window closes.
  - Continuous conviction signaling with asymptotic time decay for recurring initiative priorities.

- **Milestone Escrow, Payroll & Expense Splits (`AxiomEscrowBounties.sol`)**:
  - Locks project budgets on-chain. Funds only unlock when contributors submit deliverable hashes ($\text{SHA-256} / \text{IPFS CID}$) and the client signs off.
  - Linear per-second salary streaming for core team members.
  - Multi-party expense pools that automatically disburse funds across multiple payee addresses according to agreed basis points.

- **Artifact Lineage & Keyless OIDC Attestations (`AxiomProvenanceRegistry.sol` & `AxiomTransparencyLog.sol`)**:
  - Digital artifact registry with recursive `parentHash` pointers to track document evolution ($v1 \to v2 \to v3$) without a central database.
  - EIP-712 structured typed signatures for peer reviewers and security auditors.
  - Keyless identity sign-offs mapping verified GitHub usernames and Google Workspace emails to deliverable hashes so non-crypto contributors can sign off without managing seed phrases.
  - $O(\log N)$ Merkle inclusion proofs to audit off-chain Git commits and emergency logs.

---

## 3. Quick Walkthrough (30 Seconds)

Open **http://localhost:5173** in your browser.

1. **Interactive Demo Modal**: Click **"Simulate Protocol Run"** in the top bar to step through:
   - Alice creating a proposal with commit-reveal deadlines.
   - Bob committing a sealed ballot with a private blinding salt.
   - Fast-forwarding the EVM clock and revealing the vote with quadratic power ($\sqrt{100} = 10$).
   - Releasing milestone funds upon cryptographic deliverable verification.
2. **MACI Overwrite Test**: In the **Governance** tab on proposal AIP-1, click **Commit Ballot**, then click **MACI Override** to see how a voter can quietly replace a prior ballot.
3. **Multi-Party Expense Split**: In the **Milestone Escrow** tab, inspect the **Shared Expense Pools** and click **Approve & Disburse Split** to see automated multi-recipient payouts.
4. **Keyless OIDC Attestation**: In the **Transparency Log** tab, click **Keyless OIDC Attestation** to sign a deliverable with a verified GitHub or Google identity.
5. **Merkle Proof Tamper Check**: Select any deliverable leaf in the Merkle log, click **Verify Proof On-Chain** (valid), then click **Simulate Tampered Leaf** to watch cryptographic rejection.

---

## 4. Verification

Run the test suite:
```bash
npm test
```
All 12 unit and invariant tests run in ~500ms covering:
- Quadratic square-root dampening
- Commit-reveal secret ballot verification
- MACI ballot overwrite mechanics
- Milestone escrow release and dispute settlement
- Multi-party expense splits
- Merkle root inclusion proofs
- Keyless OIDC identity registration
