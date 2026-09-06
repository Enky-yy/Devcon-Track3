import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("AxiomEscrowBounties Protocol", function () {
  let escrow;
  let client, contributor, payee1, payee2;

  beforeEach(async function () {
    [client, contributor, payee1, payee2] = await ethers.getSigners();

    const AxiomEscrow = await ethers.getContractFactory("AxiomEscrowBounties");
    escrow = await AxiomEscrow.deploy();
    await escrow.waitForDeployment();
  });

  it("should create milestone project, submit deliverable hash, and release milestone payment", async function () {
    const titles = ["Phase 1: Architecture Spec", "Phase 2: Smart Contract Core"];
    const payouts = [ethers.parseEther("1.0"), ethers.parseEther("2.0")];
    const latestBlock = await ethers.provider.getBlock("latest");
    const deadlines = [latestBlock.timestamp + 1000, latestBlock.timestamp + 2000];

    const totalFunding = ethers.parseEther("3.0");

    await escrow.connect(client).createProject(
      contributor.address,
      "Decentralized Oracle Integration",
      titles,
      payouts,
      deadlines,
      { value: totalFunding }
    );

    const project = await escrow.projects(1);
    expect(project.totalFunded).to.equal(totalFunding);
    expect(project.remainingFunds).to.equal(totalFunding);

    const deliverableHash = "sha256:4a8b7f8c9d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a";
    await escrow.connect(contributor).submitDeliverable(
      1,
      0,
      deliverableHash,
      "Delivered architecture spec on IPFS and GitHub commit tag v0.1"
    );

    const milestone = await escrow.projectMilestones(1, 0);
    expect(milestone.status).to.equal(2);
    expect(milestone.deliverableHash).to.equal(deliverableHash);

    const initialContributorBal = await ethers.provider.getBalance(contributor.address);
    await escrow.connect(client).approveMilestone(1, 0);

    const afterContributorBal = await ethers.provider.getBalance(contributor.address);
    expect(afterContributorBal - initialContributorBal).to.equal(ethers.parseEther("1.0"));

    const projectAfter = await escrow.projects(1);
    expect(projectAfter.remainingFunds).to.equal(ethers.parseEther("2.0"));
  });

  it("should create and disburse a multi-party expense sharing pool", async function () {
    const totalFunding = ethers.parseEther("2.0");
    const payees = [payee1.address, payee2.address];
    // 70% to payee1 (7000 bps) and 30% to payee2 (3000 bps)
    const shareBps = [7000, 3000];

    await escrow.connect(client).createExpensePool(
      "ZK Summit Research Booth & Hardware Rental",
      "ipfs://QmHardwareInvoicesAndReceipts",
      payees,
      shareBps,
      { value: totalFunding }
    );

    const pool = await escrow.getExpensePool(1);
    expect(pool.totalFunded).to.equal(totalFunding);
    expect(pool.approved).to.be.false;

    const initBal1 = await ethers.provider.getBalance(payee1.address);
    const initBal2 = await ethers.provider.getBalance(payee2.address);

    await escrow.connect(client).approveAndDisburseExpense(1);

    const afterBal1 = await ethers.provider.getBalance(payee1.address);
    const afterBal2 = await ethers.provider.getBalance(payee2.address);

    expect(afterBal1 - initBal1).to.equal(ethers.parseEther("1.4")); // 70% of 2 ETH
    expect(afterBal2 - initBal2).to.equal(ethers.parseEther("0.6")); // 30% of 2 ETH
  });

  it("should create and complete a role-based task bounty", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const deadline = latestBlock.timestamp + 1000;
    const reward = ethers.parseEther("0.5");

    await escrow.connect(client).createBounty(
      "Formal Verification Audit for Governance Module",
      "Lead Auditor",
      deadline,
      { value: reward }
    );

    await escrow.connect(contributor).claimBounty(1);
    let bounty = await escrow.bounties(1);
    expect(bounty.status).to.equal(1);
    expect(bounty.claimant).to.equal(contributor.address);

    await escrow.connect(contributor).submitBountyWork(1, "ipfs://QmAuditReportFinalSigned");
    bounty = await escrow.bounties(1);
    expect(bounty.status).to.equal(2);

    const initBal = await ethers.provider.getBalance(contributor.address);
    await escrow.connect(client).approveBounty(1);

    const afterBal = await ethers.provider.getBalance(contributor.address);
    expect(afterBal - initBal).to.equal(reward);
  });

  it("should support continuous streaming payroll", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const stopTime = latestBlock.timestamp + 100;
    const deposit = ethers.parseEther("1.0");

    await escrow.connect(client).createPayrollStream(contributor.address, stopTime, { value: deposit });

    await ethers.provider.send("evm_increaseTime", [50]);
    await ethers.provider.send("evm_mine", []);

    const claimable = await escrow.getStreamBalance(1);
    expect(claimable).to.be.greaterThan(ethers.parseEther("0.4"));

    const initBal = await ethers.provider.getBalance(contributor.address);
    const tx = await escrow.connect(contributor).withdrawStream(1);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    const afterBal = await ethers.provider.getBalance(contributor.address);
    expect(afterBal + gasUsed - initBal).to.be.closeTo(claimable, ethers.parseEther("0.05"));
  });
});
