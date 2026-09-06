import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("AxiomGovernance Protocol", function () {
  let governance;
  let owner, voter1, voter2, voter3, whale;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, whale] = await ethers.getSigners();

    const AxiomGov = await ethers.getContractFactory("AxiomGovernance");
    governance = await AxiomGov.deploy();
    await governance.waitForDeployment();

    // Distribute governance credits
    await governance.allocateCredits(voter1.address, 100);
    await governance.allocateCredits(voter2.address, 100);
    await governance.allocateCredits(voter3.address, 100);
    await governance.allocateCredits(whale.address, 400);
  });

  it("should create a proposal with commit and reveal durations", async function () {
    const tx = await governance.createProposal(
      "AIP-1: Migrate DAO treasury to multi-sig streaming",
      "ipfs://QmTreasuryProposalHash123",
      60,
      60,
      ethers.ZeroAddress,
      "0x",
      0
    );
    await tx.wait();

    const prop = await governance.proposals(1);
    expect(prop.title).to.equal("AIP-1: Migrate DAO treasury to multi-sig streaming");
    expect(prop.proposer).to.equal(owner.address);
  });

  it("should enforce Commit-Reveal secret ballot and Quadratic Voting formula", async function () {
    await governance.createProposal(
      "AIP-2: Implement Anti-Collusion Funding",
      "ipfs://QmAntiCollusionAIP2",
      50,
      50,
      ethers.ZeroAddress,
      "0x",
      0
    );

    const proposalId = 1;
    const salt1 = ethers.encodeBytes32String("salt_voter1");
    const salt2 = ethers.encodeBytes32String("salt_voter2");
    const salt3 = ethers.encodeBytes32String("salt_voter3");
    const saltWhale = ethers.encodeBytes32String("salt_whale");

    const commitment1 = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint8", "uint256", "bytes32"],
      [proposalId, voter1.address, 1, 100, salt1]
    );
    const commitment2 = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint8", "uint256", "bytes32"],
      [proposalId, voter2.address, 1, 100, salt2]
    );
    const commitment3 = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint8", "uint256", "bytes32"],
      [proposalId, voter3.address, 1, 100, salt3]
    );
    const commitmentWhale = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint8", "uint256", "bytes32"],
      [proposalId, whale.address, 0, 400, saltWhale]
    );

    await governance.connect(voter1).commitVote(proposalId, commitment1);
    await governance.connect(voter2).commitVote(proposalId, commitment2);
    await governance.connect(voter3).commitVote(proposalId, commitment3);
    await governance.connect(whale).commitVote(proposalId, commitmentWhale);

    await expect(
      governance.connect(voter1).revealVote(proposalId, 1, 100, salt1)
    ).to.be.revertedWith("Reveal phase not started");

    await ethers.provider.send("evm_increaseTime", [55]);
    await ethers.provider.send("evm_mine", []);

    await governance.connect(voter1).revealVote(proposalId, 1, 100, salt1);
    await governance.connect(voter2).revealVote(proposalId, 1, 100, salt2);
    await governance.connect(voter3).revealVote(proposalId, 1, 100, salt3);
    await governance.connect(whale).revealVote(proposalId, 0, 400, saltWhale);

    const prop = await governance.proposals(proposalId);
    expect(prop.forVotesSqrt).to.equal(30n);
    expect(prop.againstVotesSqrt).to.equal(20n);

    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);

    expect(await governance.getProposalState(proposalId)).to.equal(3); // Passed

    const execTx = await governance.executeProposal(proposalId);
    await execTx.wait();

    expect(await governance.getProposalState(proposalId)).to.equal(5); // Executed
  });

  it("should support MACI anti-coercion ballot overwrite", async function () {
    await governance.createProposal(
      "AIP-3: Emergency Security Council",
      "ipfs://QmEmergencyAIP3",
      60,
      60,
      ethers.ZeroAddress,
      "0x",
      0
    );

    const proposalId = 1;
    const coercedSalt = ethers.encodeBytes32String("coerced_salt");
    const secretFreeSalt = ethers.encodeBytes32String("real_secret_salt");

    // Voter 1 is forced to commit AGAINST (0) by a briber
    const coercedCommitment = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint8", "uint256", "bytes32"],
      [proposalId, voter1.address, 0, 100, coercedSalt]
    );
    await governance.connect(voter1).commitVote(proposalId, coercedCommitment);

    // Later, in private, Voter 1 overrides the coerced ballot with a FOR (1) vote
    const realCommitment = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint8", "uint256", "bytes32"],
      [proposalId, voter1.address, 1, 100, secretFreeSalt]
    );
    await governance.connect(voter1).overrideCoercedBallot(proposalId, realCommitment);

    // Advance to reveal phase
    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);

    // Revealing the coerced vote must fail
    await expect(
      governance.connect(voter1).revealVote(proposalId, 0, 100, coercedSalt)
    ).to.be.revertedWith("Commitment mismatch");

    // Revealing the authentic secret ballot succeeds!
    await governance.connect(voter1).revealVote(proposalId, 1, 100, secretFreeSalt);
    const prop = await governance.proposals(proposalId);
    expect(prop.forVotesSqrt).to.equal(10n);
    expect(prop.againstVotesSqrt).to.equal(0n);
  });

  it("should create conviction signals and accumulate time-weighted support", async function () {
    await governance.createConvictionSignal(
      "Decentralized Storage Node Subsidies",
      "QmHashConvictionSignal1"
    );

    const signalId = 1;
    await governance.connect(voter1).stakeConviction(signalId, 50);

    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    await governance.connect(voter2).stakeConviction(signalId, 50);

    const sig = await governance.convictionSignals(signalId);
    expect(sig.totalWeight).to.equal(100n);
    expect(sig.convictionScore).to.be.greaterThan(0n);
  });
});
