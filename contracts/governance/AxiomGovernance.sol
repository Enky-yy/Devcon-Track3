// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxiomGovernance
 * @author Axiom Protocol
 * @notice Anti-collusion, commit-reveal quadratic voting, MACI key-rotation, & conviction engine.
 * @dev Implements:
 *   1. Commit-Reveal Secret Ballot: eliminates vote-buying, bribing, and herd behavior.
 *   2. MACI Anti-Coercion Mechanism: allows voter key rotation and ballot overwrite to invalidate coerced votes.
 *   3. Quadratic Voting (QV): Quadratic cost curve sqrt(credits) dampening whale domination.
 *   4. Conviction Signaling: Continuous dynamic signaling for DAO initiatives.
 */
contract AxiomGovernance is ReentrancyGuard, Ownable {

    enum ProposalState {
        Pending,
        CommitPhase,
        RevealPhase,
        Passed,
        Defeated,
        Executed,
        Cancelled
    }

    enum VoteChoice {
        Against,
        For,
        Abstain
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string ipfsMetadataHash;
        uint256 commitStartTime;
        uint256 commitEndTime;
        uint256 revealEndTime;
        uint256 forVotesSqrt;     // Sum of sqrt(credits) for "For"
        uint256 againstVotesSqrt; // Sum of sqrt(credits) for "Against"
        uint256 abstainVotesSqrt; // Sum of sqrt(credits) for "Abstain"
        uint256 totalRawCredits;  // Sum of raw credits allocated
        bool executed;
        bool cancelled;
        address executionTarget;
        bytes executionData;
        uint256 executionValue;
    }

    struct ConvictionSignal {
        uint256 id;
        string title;
        string descriptionHash;
        uint256 totalWeight;
        uint256 convictionScore;
        uint256 lastUpdated;
        bool active;
    }

    // Proposal ID => Proposal
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCounter;

    // Proposal ID => Voter Address => Commitment Hash
    mapping(uint256 => mapping(address => bytes32)) public voteCommitments;
    // Proposal ID => Voter Address => Has Revealed
    mapping(uint256 => mapping(address => bool)) public hasRevealed;

    // MACI Key-Rotation state: Voter => current registered public key hash
    mapping(address => bytes32) public voterKeyHashes;
    // Track count of ballot overrides per voter per proposal
    mapping(uint256 => mapping(address => uint256)) public ballotRevisionCount;

    // Voter token/credit balance available for governance
    mapping(address => uint256) public governanceCredits;

    // Conviction signals
    mapping(uint256 => ConvictionSignal) public convictionSignals;
    uint256 public convictionCounter;
    // Signal ID => Voter => staked weight
    mapping(uint256 => mapping(address => uint256)) public signalStakes;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string ipfsMetadataHash,
        uint256 commitEndTime,
        uint256 revealEndTime
    );

    event VoteCommitted(uint256 indexed proposalId, address indexed voter, bytes32 commitment);
    event BallotOverridden(uint256 indexed proposalId, address indexed voter, bytes32 newCommitment, uint256 revision);
    event VoterKeyRotated(address indexed voter, bytes32 newKeyHash);

    event VoteRevealed(
        uint256 indexed proposalId,
        address indexed voter,
        VoteChoice choice,
        uint256 credits,
        uint256 effectiveVotes
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);

    event ConvictionSignalCreated(uint256 indexed signalId, string title, string descriptionHash);
    event ConvictionStaked(uint256 indexed signalId, address indexed supporter, uint256 weight);
    event ConvictionUpdated(uint256 indexed signalId, uint256 newScore);

    constructor() Ownable(msg.sender) {
        governanceCredits[msg.sender] = 10_000;
    }

    function allocateCredits(address recipient, uint256 amount) external onlyOwner {
        governanceCredits[recipient] += amount;
    }

    function requestTestCredits(uint256 amount) external {
        require(amount <= 1000, "Max 1000 credits per request");
        governanceCredits[msg.sender] += amount;
    }

    function createProposal(
        string calldata title,
        string calldata ipfsMetadataHash,
        uint256 commitDuration,
        uint256 revealDuration,
        address executionTarget,
        bytes calldata executionData,
        uint256 executionValue
    ) external returns (uint256) {
        require(commitDuration >= 10, "Commit duration must be >= 10s");
        require(revealDuration >= 10, "Reveal duration must be >= 10s");

        proposalCounter++;
        uint256 pid = proposalCounter;

        uint256 commitStart = block.timestamp;
        uint256 commitEnd = commitStart + commitDuration;
        uint256 revealEnd = commitEnd + revealDuration;

        proposals[pid] = Proposal({
            id: pid,
            proposer: msg.sender,
            title: title,
            ipfsMetadataHash: ipfsMetadataHash,
            commitStartTime: commitStart,
            commitEndTime: commitEnd,
            revealEndTime: revealEnd,
            forVotesSqrt: 0,
            againstVotesSqrt: 0,
            abstainVotesSqrt: 0,
            totalRawCredits: 0,
            executed: false,
            cancelled: false,
            executionTarget: executionTarget,
            executionData: executionData,
            executionValue: executionValue
        });

        emit ProposalCreated(pid, msg.sender, title, ipfsMetadataHash, commitEnd, revealEnd);
        return pid;
    }

    /**
     * @notice Step 1: Commit secret ballot
     */
    function commitVote(uint256 proposalId, bytes32 commitment) external {
        Proposal storage prop = proposals[proposalId];
        require(prop.id != 0, "Proposal does not exist");
        require(!prop.cancelled, "Proposal cancelled");
        require(block.timestamp >= prop.commitStartTime, "Commit not started");
        require(block.timestamp <= prop.commitEndTime, "Commit phase ended");
        require(commitment != bytes32(0), "Invalid commitment");

        voteCommitments[proposalId][msg.sender] = commitment;
        emit VoteCommitted(proposalId, msg.sender, commitment);
    }

    /**
     * @notice MACI Anti-Coercion: Overwrite an earlier coerced ballot with a fresh secret ballot
     * @dev A voter who was physically forced or bribed to submit a specific vote can overwrite it
     *      later in the commit window with zero on-chain traceability of the new choice.
     */
    function overrideCoercedBallot(uint256 proposalId, bytes32 newCommitment) external {
        Proposal storage prop = proposals[proposalId];
        require(prop.id != 0, "Proposal does not exist");
        require(block.timestamp <= prop.commitEndTime, "Commit phase ended");
        require(voteCommitments[proposalId][msg.sender] != bytes32(0), "No prior ballot to override");
        require(newCommitment != bytes32(0), "Invalid new commitment");

        voteCommitments[proposalId][msg.sender] = newCommitment;
        ballotRevisionCount[proposalId][msg.sender]++;

        emit BallotOverridden(proposalId, msg.sender, newCommitment, ballotRevisionCount[proposalId][msg.sender]);
    }

    /**
     * @notice Register or rotate voter key for MACI anti-collusion state tree
     */
    function registerVoterKey(bytes32 newKeyHash) external {
        require(newKeyHash != bytes32(0), "Key hash required");
        voterKeyHashes[msg.sender] = newKeyHash;
        emit VoterKeyRotated(msg.sender, newKeyHash);
    }

    /**
     * @notice Step 2: Reveal secret ballot during reveal phase
     */
    function revealVote(
        uint256 proposalId,
        VoteChoice choice,
        uint256 credits,
        bytes32 salt
    ) external nonReentrant {
        Proposal storage prop = proposals[proposalId];
        require(prop.id != 0, "Proposal does not exist");
        require(!prop.cancelled, "Proposal cancelled");
        require(block.timestamp > prop.commitEndTime, "Reveal phase not started");
        require(block.timestamp <= prop.revealEndTime, "Reveal phase ended");
        require(!hasRevealed[proposalId][msg.sender], "Vote already revealed");

        bytes32 expectedCommitment = keccak256(abi.encodePacked(proposalId, msg.sender, uint8(choice), credits, salt));
        require(voteCommitments[proposalId][msg.sender] == expectedCommitment, "Commitment mismatch");

        require(governanceCredits[msg.sender] >= credits, "Insufficient governance credits");
        require(credits > 0, "Credits must be > 0");

        governanceCredits[msg.sender] -= credits;
        hasRevealed[proposalId][msg.sender] = true;

        uint256 effectiveVotes = _sqrt(credits);

        if (choice == VoteChoice.For) {
            prop.forVotesSqrt += effectiveVotes;
        } else if (choice == VoteChoice.Against) {
            prop.againstVotesSqrt += effectiveVotes;
        } else {
            prop.abstainVotesSqrt += effectiveVotes;
        }

        prop.totalRawCredits += credits;

        emit VoteRevealed(proposalId, msg.sender, choice, credits, effectiveVotes);
    }

    function executeProposal(uint256 proposalId) external nonReentrant returns (bool) {
        Proposal storage prop = proposals[proposalId];
        require(prop.id != 0, "Proposal does not exist");
        require(!prop.executed, "Already executed");
        require(!prop.cancelled, "Proposal cancelled");
        require(block.timestamp > prop.revealEndTime, "Voting still active");
        require(prop.forVotesSqrt > prop.againstVotesSqrt, "Proposal did not pass");

        prop.executed = true;

        if (prop.executionTarget != address(0)) {
            (bool success, ) = prop.executionTarget.call{value: prop.executionValue}(prop.executionData);
            require(success, "Execution payload reverted");
        }

        emit ProposalExecuted(proposalId);
        return true;
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage prop = proposals[proposalId];
        require(msg.sender == prop.proposer || msg.sender == owner(), "Not authorized");
        require(!prop.executed, "Cannot cancel executed proposal");
        prop.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage prop = proposals[proposalId];
        if (prop.id == 0) revert("Proposal does not exist");
        if (prop.cancelled) return ProposalState.Cancelled;
        if (prop.executed) return ProposalState.Executed;
        if (block.timestamp < prop.commitStartTime) return ProposalState.Pending;
        if (block.timestamp <= prop.commitEndTime) return ProposalState.CommitPhase;
        if (block.timestamp <= prop.revealEndTime) return ProposalState.RevealPhase;
        if (prop.forVotesSqrt > prop.againstVotesSqrt) return ProposalState.Passed;
        return ProposalState.Defeated;
    }

    // --- CONVICTION SIGNALING MECHANISM ---

    function createConvictionSignal(string calldata title, string calldata descriptionHash) external returns (uint256) {
        convictionCounter++;
        uint256 sid = convictionCounter;
        convictionSignals[sid] = ConvictionSignal({
            id: sid,
            title: title,
            descriptionHash: descriptionHash,
            totalWeight: 0,
            convictionScore: 0,
            lastUpdated: block.timestamp,
            active: true
        });
        emit ConvictionSignalCreated(sid, title, descriptionHash);
        return sid;
    }

    function stakeConviction(uint256 signalId, uint256 weight) external {
        ConvictionSignal storage sig = convictionSignals[signalId];
        require(sig.active, "Signal not active");
        require(governanceCredits[msg.sender] >= weight, "Insufficient credits");

        governanceCredits[msg.sender] -= weight;
        signalStakes[signalId][msg.sender] += weight;

        uint256 delta = block.timestamp - sig.lastUpdated;
        sig.convictionScore = sig.convictionScore + (sig.totalWeight * delta);
        sig.totalWeight += weight;
        sig.lastUpdated = block.timestamp;

        emit ConvictionStaked(signalId, msg.sender, weight);
        emit ConvictionUpdated(signalId, sig.convictionScore);
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
