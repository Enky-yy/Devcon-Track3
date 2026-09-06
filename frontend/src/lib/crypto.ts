import { ethers } from 'ethers';

/**
 * Compute commit-reveal hash matching AxiomGovernance.sol
 * keccak256(abi.encodePacked(proposalId, voter, uint8(choice), credits, salt))
 */
export function computeCommitment(
  proposalId: number,
  voterAddress: string,
  choice: number, // 0 = Against, 1 = For, 2 = Abstain
  credits: number,
  saltHex: string
): string {
  return ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'uint8', 'uint256', 'bytes32'],
    [proposalId, voterAddress, choice, credits, saltHex]
  );
}

/**
 * Generate cryptographically secure 32-byte blinding salt
 */
export function generateBlindingSalt(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Integer square root calculation matching EVM Babylonian method
 */
export function calculateQuadraticPower(credits: number): number {
  if (credits <= 0) return 0;
  return Math.floor(Math.sqrt(credits));
}

/**
 * Standard Merkle Tree calculation matching OpenZeppelin MerkleProof.verify
 */
export interface MerkleData {
  root: string;
  leaves: string[];
  proofs: { [leaf: string]: string[] };
}

export function buildMerkleTree(leafItems: string[]): MerkleData {
  if (leafItems.length === 0) {
    return { root: ethers.ZeroHash, leaves: [], proofs: {} };
  }

  // Hash each leaf
  let hashedLeaves = leafItems.map((item) => ethers.id(item));
  
  // Sort leaves for deterministic trees
  const originalHashed = [...hashedLeaves];
  let currentLevel = [...hashedLeaves];

  // Store levels for proof construction
  const levels: string[][] = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        // Sort pairs matching OpenZeppelin's commutative hash
        const combined = left < right 
          ? ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [left, right])
          : ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [right, left]);
        nextLevel.push(combined);
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = currentLevel[0] || ethers.ZeroHash;

  // Generate proofs for each original leaf
  const proofs: { [leaf: string]: string[] } = {};

  for (let idx = 0; idx < originalHashed.length; idx++) {
    const leaf = originalHashed[idx];
    const proof: string[] = [];
    let pos = idx;

    for (let levelIdx = 0; levelIdx < levels.length - 1; levelIdx++) {
      const level = levels[levelIdx];
      const isRightNode = pos % 2 === 1;
      const siblingPos = isRightNode ? pos - 1 : pos + 1;

      if (siblingPos < level.length) {
        proof.push(level[siblingPos]);
      }
      pos = Math.floor(pos / 2);
    }

    proofs[leaf] = proof;
  }

  return {
    root,
    leaves: originalHashed,
    proofs,
  };
}

/**
 * Verify inclusion proof locally
 */
export function verifyMerkleProof(proof: string[], root: string, leaf: string): boolean {
  let computedHash = leaf;

  for (const proofElement of proof) {
    if (computedHash < proofElement) {
      computedHash = ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [computedHash, proofElement]);
    } else {
      computedHash = ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [proofElement, computedHash]);
    }
  }

  return computedHash === root;
}
