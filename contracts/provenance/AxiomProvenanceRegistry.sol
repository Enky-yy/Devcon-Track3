// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxiomProvenanceRegistry
 * @author Axiom Protocol
 * @notice Verifiable on-chain attribution and DAG artifact lineage registry.
 * @dev Proves tamper-free history of digital artifacts, research papers, governance proposals,
 *      and off-chain DAO reports using cryptographic hashing and EIP-712 typed attestations.
 */
contract AxiomProvenanceRegistry is EIP712, Ownable {
    using ECDSA for bytes32;

    struct Artifact {
        bytes32 artifactHash;
        address author;
        bytes32 parentHash;       // Points to previous version in DAG (0x0 if root)
        uint256 version;
        string title;
        string metadataURI;       // IPFS/Arweave link to artifact contents
        uint256 timestamp;
        bool exists;
    }

    struct Attestation {
        address signer;
        string role;              // e.g. "Lead Reviewer", "Security Auditor", "DAO Signer"
        string statement;         // e.g. "Verified reproducibility of benchmarks"
        uint256 timestamp;
    }

    // TypeHash for EIP-712 structured attestations
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "ArtifactAttestation(bytes32 artifactHash,string role,string statement,uint256 timestamp)"
    );

    // ArtifactHash => Artifact
    mapping(bytes32 => Artifact) public artifacts;
    // ArtifactHash => Array of Attestations
    mapping(bytes32 => Attestation[]) public artifactAttestations;
    // Author => Array of artifact hashes
    mapping(address => bytes32[]) public authorArtifacts;

    uint256 public totalArtifactsCount;

    // Events
    event ArtifactRegistered(
        bytes32 indexed artifactHash,
        address indexed author,
        bytes32 indexed parentHash,
        uint256 version,
        string title,
        string metadataURI
    );

    event AttestationAdded(
        bytes32 indexed artifactHash,
        address indexed signer,
        string role,
        string statement
    );

    constructor() EIP712("AxiomProvenanceRegistry", "1.0.0") Ownable(msg.sender) {}

    /**
     * @notice Register a digital artifact with author provenance and DAG lineage link
     * @param artifactHash Cryptographic content hash (sha256 or keccak256 of file/data)
     * @param parentHash Hash of prior version (or bytes32(0) if original version)
     * @param title Human readable title
     * @param metadataURI Off-chain metadata URI (ipfs://...)
     */
    function registerArtifact(
        bytes32 artifactHash,
        bytes32 parentHash,
        string calldata title,
        string calldata metadataURI
    ) external returns (bool) {
        require(artifactHash != bytes32(0), "Invalid artifact hash");
        require(!artifacts[artifactHash].exists, "Artifact already registered");

        uint256 version = 1;
        if (parentHash != bytes32(0)) {
            require(artifacts[parentHash].exists, "Parent artifact does not exist");
            version = artifacts[parentHash].version + 1;
        }

        artifacts[artifactHash] = Artifact({
            artifactHash: artifactHash,
            author: msg.sender,
            parentHash: parentHash,
            version: version,
            title: title,
            metadataURI: metadataURI,
            timestamp: block.timestamp,
            exists: true
        });

        authorArtifacts[msg.sender].push(artifactHash);
        totalArtifactsCount++;

        emit ArtifactRegistered(artifactHash, msg.sender, parentHash, version, title, metadataURI);
        return true;
    }

    /**
     * @notice Direct on-chain attestation by an author or reviewer
     */
    function addAttestation(
        bytes32 artifactHash,
        string calldata role,
        string calldata statement
    ) external {
        require(artifacts[artifactHash].exists, "Artifact not found");
        require(bytes(role).length > 0, "Role cannot be empty");

        artifactAttestations[artifactHash].push(Attestation({
            signer: msg.sender,
            role: role,
            statement: statement,
            timestamp: block.timestamp
        }));

        emit AttestationAdded(artifactHash, msg.sender, role, statement);
    }

    /**
     * @notice Submit and verify an EIP-712 off-chain cryptographic attestation
     */
    function submitOffChainAttestation(
        bytes32 artifactHash,
        string calldata role,
        string calldata statement,
        uint256 timestamp,
        bytes calldata signature
    ) external returns (address) {
        require(artifacts[artifactHash].exists, "Artifact not found");

        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                artifactHash,
                keccak256(bytes(role)),
                keccak256(bytes(statement)),
                timestamp
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner != address(0), "Invalid signature");

        artifactAttestations[artifactHash].push(Attestation({
            signer: recoveredSigner,
            role: role,
            statement: statement,
            timestamp: timestamp
        }));

        emit AttestationAdded(artifactHash, recoveredSigner, role, statement);
        return recoveredSigner;
    }

    /**
     * @notice Retrieve all attestations for a given artifact
     */
    function getAttestations(bytes32 artifactHash) external view returns (Attestation[] memory) {
        return artifactAttestations[artifactHash];
    }

    /**
     * @notice Verify full revision lineage back to genesis
     */
    function getLineage(bytes32 artifactHash) external view returns (bytes32[] memory) {
        require(artifacts[artifactHash].exists, "Artifact not found");

        // Count depth
        uint256 depth = 0;
        bytes32 curr = artifactHash;
        while (curr != bytes32(0)) {
            depth++;
            curr = artifacts[curr].parentHash;
        }

        bytes32[] memory lineage = new bytes32[](depth);
        curr = artifactHash;
        for (uint256 i = 0; i < depth; i++) {
            lineage[i] = curr;
            curr = artifacts[curr].parentHash;
        }

        return lineage;
    }
}
