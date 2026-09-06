import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("AxiomProvenance & TransparencyLog Protocol", function () {
  let registry, transparencyLog;
  let author, reviewer, other;

  beforeEach(async function () {
    [author, reviewer, other] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("AxiomProvenanceRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Log = await ethers.getContractFactory("AxiomTransparencyLog");
    transparencyLog = await Log.deploy();
    await transparencyLog.waitForDeployment();
  });

  it("should register digital artifacts and trace DAG version lineage", async function () {
    const rootHash = ethers.id("Axiom Whitepaper v1.0.0");
    const childHash = ethers.id("Axiom Whitepaper v2.0.0 - Updated QV Model");

    await registry.connect(author).registerArtifact(
      rootHash,
      ethers.ZeroHash,
      "Axiom Protocol Whitepaper v1",
      "ipfs://QmWhitepaperV1"
    );

    let rootArt = await registry.artifacts(rootHash);
    expect(rootArt.version).to.equal(1n);
    expect(rootArt.author).to.equal(author.address);

    await registry.connect(author).registerArtifact(
      childHash,
      rootHash,
      "Axiom Protocol Whitepaper v2",
      "ipfs://QmWhitepaperV2"
    );

    let childArt = await registry.artifacts(childHash);
    expect(childArt.version).to.equal(2n);
    expect(childArt.parentHash).to.equal(rootHash);

    const lineage = await registry.getLineage(childHash);
    expect(lineage.length).to.equal(2);
    expect(lineage[0]).to.equal(childHash);
    expect(lineage[1]).to.equal(rootHash);
  });

  it("should verify EIP-712 typed structured attestations", async function () {
    const artifactHash = ethers.id("zkEVM Benchmark Dataset 2026");

    await registry.connect(author).registerArtifact(
      artifactHash,
      ethers.ZeroHash,
      "zkEVM Benchmark Dataset",
      "ipfs://QmDatasetHash"
    );

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const registryAddress = await registry.getAddress();

    const domain = {
      name: "AxiomProvenanceRegistry",
      version: "1.0.0",
      chainId: chainId,
      verifyingContract: registryAddress,
    };

    const types = {
      ArtifactAttestation: [
        { name: "artifactHash", type: "bytes32" },
        { name: "role", type: "string" },
        { name: "statement", type: "string" },
        { name: "timestamp", type: "uint256" },
      ],
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const value = {
      artifactHash: artifactHash,
      role: "Lead Reproducibility Reviewer",
      statement: "Cryptographic benchmarks verified on bare metal cluster.",
      timestamp: timestamp,
    };

    const signature = await reviewer.signTypedData(domain, types, value);

    await registry.submitOffChainAttestation(
      artifactHash,
      value.role,
      value.statement,
      timestamp,
      signature
    );

    const attestations = await registry.getAttestations(artifactHash);
    expect(attestations.length).to.equal(1);
    expect(attestations[0].signer).to.equal(reviewer.address);
    expect(attestations[0].role).to.equal("Lead Reproducibility Reviewer");
  });

  it("should commit Merkle checkpoints and verify off-chain inclusion proofs", async function () {
    const leaves = [
      ethers.id("git:commit:1a2b3c4d: core-contracts release"),
      ethers.id("git:commit:5e6f7a8b: zk-circuit audit report"),
      ethers.id("git:commit:9c0d1e2f: treasury diversification"),
      ethers.id("git:commit:3a4b5c6d: emergency bug bounty patch")
    ].sort();

    const hash01 = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "bytes32"], leaves[0] < leaves[1] ? [leaves[0], leaves[1]] : [leaves[1], leaves[0]])
    );
    const hash23 = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "bytes32"], leaves[2] < leaves[3] ? [leaves[2], leaves[3]] : [leaves[3], leaves[2]])
    );
    const root = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "bytes32"], hash01 < hash23 ? [hash01, hash23] : [hash23, hash01])
    );

    await transparencyLog.commitCheckpoint(
      root,
      "DAO WorkingGroupDeliveries Q3",
      "ipfs://QmCheckpointBatchArchive",
      4
    );

    expect(await transparencyLog.getCheckpointsCount()).to.equal(1n);

    const proof0 = [leaves[1], hash23];
    const isValid = await transparencyLog.verifyInclusion(root, leaves[0], proof0);
    expect(isValid).to.be.true;

    const fakeLeaf = ethers.id("fake rogue commit");
    const isFakeValid = await transparencyLog.verifyInclusion(root, fakeLeaf, proof0);
    expect(isFakeValid).to.be.false;
  });

  it("should record and retrieve Keyless OIDC Attestations (GitHub/Google identity sign-offs)", async function () {
    const deliverableHash = ethers.id("git:release:v2.1.0-zk-prover-circuit");
    const issuer = "https://github.com/login/oauth";
    const githubUserHash = ethers.id("github:user:vitalik-maintainer");
    const role = "Lead Core Maintainer";

    await transparencyLog.recordKeylessAttestation(
      deliverableHash,
      issuer,
      githubUserHash,
      role
    );

    expect(await transparencyLog.totalKeylessAttestations()).to.equal(1n);

    const attestations = await transparencyLog.getKeylessAttestations(deliverableHash);
    expect(attestations.length).to.equal(1);
    expect(attestations[0].issuer).to.equal(issuer);
    expect(attestations[0].identityClaimHash).to.equal(githubUserHash);
    expect(attestations[0].role).to.equal(role);
    expect(attestations[0].verified).to.be.true;
  });
});
