// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxiomTransparencyLog
 * @author Axiom Protocol
 * @notice Immutable checkpointing, Merkle inclusion proofs, and Keyless OIDC Attestations for DAO workflows.
 * @dev Anchors off-chain Git commits, working group deliveries, and GitHub/Google OIDC identity signoffs onto Ethereum.
 */
contract AxiomTransparencyLog is Ownable {

    struct LogCheckpoint {
        bytes32 merkleRoot;
        string logType;            // e.g. "WorkingGroupDelivery", "EmergencyAction", "AuditTrail"
        string snapshotURI;        // ipfs:// link to batch archive
        address committedBy;
        uint256 timestamp;
        uint256 leafCount;
    }

    struct KeylessAttestation {
        bytes32 deliverableHash;
        string issuer;             // e.g. "https://github.com/login/oauth" or "https://accounts.google.com"
        string identityClaimHash;  // e.g. sha256(github_username) or sha256(google_email)
        string role;               // e.g. "Security Reviewer", "Lead Maintainer"
        address relayer;
        uint256 timestamp;
        bool verified;
    }

    // Root => LogCheckpoint
    mapping(bytes32 => LogCheckpoint) public checkpoints;
    bytes32[] public allRoots;

    // DeliverableHash => Array of Keyless Attestations
    mapping(bytes32 => KeylessAttestation[]) public deliverableAttestations;
    uint256 public totalKeylessAttestations;

    event CheckpointCommitted(
        bytes32 indexed merkleRoot,
        address indexed committer,
        string logType,
        string snapshotURI,
        uint256 leafCount
    );

    event KeylessAttestationRecorded(
        bytes32 indexed deliverableHash,
        string issuer,
        string identityClaimHash,
        string role,
        address indexed relayer
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Anchor a new batch of off-chain records by posting its Merkle root
     */
    function commitCheckpoint(
        bytes32 merkleRoot,
        string calldata logType,
        string calldata snapshotURI,
        uint256 leafCount
    ) external returns (bool) {
        require(merkleRoot != bytes32(0), "Root cannot be zero");
        require(checkpoints[merkleRoot].merkleRoot == bytes32(0), "Root already committed");

        checkpoints[merkleRoot] = LogCheckpoint({
            merkleRoot: merkleRoot,
            logType: logType,
            snapshotURI: snapshotURI,
            committedBy: msg.sender,
            timestamp: block.timestamp,
            leafCount: leafCount
        });

        allRoots.push(merkleRoot);

        emit CheckpointCommitted(merkleRoot, msg.sender, logType, snapshotURI, leafCount);
        return true;
    }

    /**
     * @notice Cryptographically verify that an off-chain record is included in a committed checkpoint
     */
    function verifyInclusion(
        bytes32 merkleRoot,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        require(checkpoints[merkleRoot].merkleRoot != bytes32(0), "Checkpoint root does not exist");
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    /**
     * @notice Record a verified keyless OIDC attestation (e.g. GitHub username or Google email identity)
     * @dev Verified off-chain via transparency log / OIDC JWT oracle and immutably anchored.
     */
    function recordKeylessAttestation(
        bytes32 deliverableHash,
        string calldata issuer,
        string calldata identityClaimHash,
        string calldata role
    ) external returns (bool) {
        require(deliverableHash != bytes32(0), "Deliverable hash required");
        require(bytes(issuer).length > 0, "Issuer required");
        require(bytes(identityClaimHash).length > 0, "Identity claim required");

        deliverableAttestations[deliverableHash].push(KeylessAttestation({
            deliverableHash: deliverableHash,
            issuer: issuer,
            identityClaimHash: identityClaimHash,
            role: role,
            relayer: msg.sender,
            timestamp: block.timestamp,
            verified: true
        }));

        totalKeylessAttestations++;

        emit KeylessAttestationRecorded(deliverableHash, issuer, identityClaimHash, role, msg.sender);
        return true;
    }

    /**
     * @notice Get all keyless attestations for a given deliverable
     */
    function getKeylessAttestations(bytes32 deliverableHash) external view returns (KeylessAttestation[] memory) {
        return deliverableAttestations[deliverableHash];
    }

    /**
     * @notice Total number of committed checkpoints
     */
    function getCheckpointsCount() external view returns (uint256) {
        return allRoots.length;
    }
}
