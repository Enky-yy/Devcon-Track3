// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxiomEscrowBounties
 * @author Axiom Protocol
 * @notice Trustless milestone streaming payroll, multi-party expense sharing, and role-based task bounties.
 * @dev Enables milestone locked payments, cryptographic deliverable proof anchors,
 *      linear payroll streaming, multi-party expense splits, and transparent dispute mechanics.
 */
contract AxiomEscrowBounties is ReentrancyGuard, Ownable {

    enum MilestoneStatus {
        Pending,
        InProgress,
        Submitted,
        Approved,
        Disputed,
        Released,
        Refunded
    }

    enum BountyStatus {
        Open,
        Claimed,
        Submitted,
        Completed,
        Cancelled
    }

    struct Milestone {
        string title;
        uint256 payoutAmount;
        uint256 deadline;
        MilestoneStatus status;
        string deliverableHash;    // Cryptographic hash (IPFS/Git commit/Attestation UID)
        string deliverableNotes;
        uint256 submissionTime;
    }

    struct MilestoneProject {
        uint256 id;
        address client;
        address contributor;
        string title;
        uint256 totalFunded;
        uint256 remainingFunds;
        uint256 milestoneCount;
        bool completed;
        bool disputed;
    }

    struct TaskBounty {
        uint256 id;
        address creator;
        address claimant;
        string title;
        string requiredRole;       // e.g., "Smart Contract Auditor", "Core Dev", "Researcher"
        uint256 rewardAmount;
        uint256 deadline;
        BountyStatus status;
        string submissionHash;
    }

    struct PayrollStream {
        uint256 id;
        address employer;
        address recipient;
        uint256 ratePerSecond;     // Wei per second
        uint256 startTime;
        uint256 stopTime;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        bool active;
    }

    struct ExpensePool {
        uint256 id;
        address creator;
        string title;
        string receiptHash;        // IPFS/SHA-256 hash of receipts/invoices
        uint256 totalFunded;
        address[] payees;
        uint256[] shareBps;        // Basis points (10000 = 100%)
        bool approved;
        bool disbursed;
    }

    // Projects: ProjectId => MilestoneProject
    mapping(uint256 => MilestoneProject) public projects;
    mapping(uint256 => mapping(uint256 => Milestone)) public projectMilestones;
    uint256 public projectCounter;

    // Bounties: BountyId => TaskBounty
    mapping(uint256 => TaskBounty) public bounties;
    uint256 public bountyCounter;

    // Payroll Streams: StreamId => PayrollStream
    mapping(uint256 => PayrollStream) public streams;
    uint256 public streamCounter;

    // Expense Pools: PoolId => ExpensePool
    mapping(uint256 => ExpensePool) public expensePools;
    uint256 public expenseCounter;

    // Events
    event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed contributor, uint256 totalFunded, uint256 milestoneCount);
    event DeliverableSubmitted(uint256 indexed projectId, uint256 indexed milestoneIndex, string deliverableHash);
    event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 payout);
    event MilestoneDisputed(uint256 indexed projectId, uint256 indexed milestoneIndex);
    event DisputeResolved(uint256 indexed projectId, uint256 indexed milestoneIndex, bool releasedToContributor);

    event BountyCreated(uint256 indexed bountyId, address indexed creator, string title, uint256 reward);
    event BountyClaimed(uint256 indexed bountyId, address indexed claimant);
    event BountySubmitted(uint256 indexed bountyId, address indexed claimant, string submissionHash);
    event BountyApproved(uint256 indexed bountyId, address indexed claimant, uint256 reward);

    event StreamCreated(uint256 indexed streamId, address indexed employer, address indexed recipient, uint256 ratePerSecond);
    event StreamWithdrawal(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event StreamCancelled(uint256 indexed streamId, uint256 refundedEmployer, uint256 paidRecipient);

    event ExpensePoolCreated(uint256 indexed poolId, address indexed creator, string title, uint256 totalFunded);
    event ExpenseDisbursed(uint256 indexed poolId, uint256 totalDisbursed);

    constructor() Ownable(msg.sender) {}

    // --- MILESTONE ESCROW ---

    function createProject(
        address contributor,
        string calldata title,
        string[] calldata milestoneTitles,
        uint256[] calldata milestonePayouts,
        uint256[] calldata milestoneDeadlines
    ) external payable returns (uint256) {
        require(contributor != address(0), "Invalid contributor");
        require(milestoneTitles.length > 0, "No milestones specified");
        require(
            milestoneTitles.length == milestonePayouts.length &&
            milestoneTitles.length == milestoneDeadlines.length,
            "Array lengths mismatch"
        );

        uint256 sumPayouts = 0;
        for (uint256 i = 0; i < milestonePayouts.length; i++) {
            sumPayouts += milestonePayouts[i];
        }
        require(msg.value == sumPayouts, "Sent value does not match total milestone payouts");

        projectCounter++;
        uint256 pid = projectCounter;

        projects[pid] = MilestoneProject({
            id: pid,
            client: msg.sender,
            contributor: contributor,
            title: title,
            totalFunded: msg.value,
            remainingFunds: msg.value,
            milestoneCount: milestoneTitles.length,
            completed: false,
            disputed: false
        });

        for (uint256 i = 0; i < milestoneTitles.length; i++) {
            projectMilestones[pid][i] = Milestone({
                title: milestoneTitles[i],
                payoutAmount: milestonePayouts[i],
                deadline: milestoneDeadlines[i],
                status: MilestoneStatus.Pending,
                deliverableHash: "",
                deliverableNotes: "",
                submissionTime: 0
            });
        }

        emit ProjectCreated(pid, msg.sender, contributor, msg.value, milestoneTitles.length);
        return pid;
    }

    function submitDeliverable(
        uint256 projectId,
        uint256 milestoneIndex,
        string calldata deliverableHash,
        string calldata deliverableNotes
    ) external {
        MilestoneProject storage project = projects[projectId];
        require(msg.sender == project.contributor, "Only contributor can submit");
        require(milestoneIndex < project.milestoneCount, "Milestone index out of bounds");

        Milestone storage m = projectMilestones[projectId][milestoneIndex];
        require(
            m.status == MilestoneStatus.Pending || m.status == MilestoneStatus.InProgress,
            "Milestone not in submittable state"
        );
        require(bytes(deliverableHash).length > 0, "Deliverable hash required");

        m.status = MilestoneStatus.Submitted;
        m.deliverableHash = deliverableHash;
        m.deliverableNotes = deliverableNotes;
        m.submissionTime = block.timestamp;

        emit DeliverableSubmitted(projectId, milestoneIndex, deliverableHash);
    }

    function approveMilestone(uint256 projectId, uint256 milestoneIndex) external nonReentrant {
        MilestoneProject storage project = projects[projectId];
        require(msg.sender == project.client || msg.sender == owner(), "Only client can approve");
        require(milestoneIndex < project.milestoneCount, "Milestone index out of bounds");

        Milestone storage m = projectMilestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "Milestone not submitted");

        uint256 payout = m.payoutAmount;
        require(project.remainingFunds >= payout, "Insufficient project escrow balance");

        m.status = MilestoneStatus.Released;
        project.remainingFunds -= payout;

        (bool success, ) = project.contributor.call{value: payout}("");
        require(success, "Transfer to contributor failed");

        emit MilestoneApproved(projectId, milestoneIndex, payout);
    }

    function disputeMilestone(uint256 projectId, uint256 milestoneIndex) external {
        MilestoneProject storage project = projects[projectId];
        require(msg.sender == project.client || msg.sender == project.contributor, "Unauthorized");
        require(milestoneIndex < project.milestoneCount, "Invalid milestone");

        Milestone storage m = projectMilestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted || m.status == MilestoneStatus.InProgress, "Cannot dispute");

        m.status = MilestoneStatus.Disputed;
        project.disputed = true;

        emit MilestoneDisputed(projectId, milestoneIndex);
    }

    function resolveDispute(uint256 projectId, uint256 milestoneIndex, bool releaseToContributor) external onlyOwner nonReentrant {
        MilestoneProject storage project = projects[projectId];
        Milestone storage m = projectMilestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Disputed, "Not disputed");

        uint256 payout = m.payoutAmount;
        require(project.remainingFunds >= payout, "Insufficient balance");
        project.remainingFunds -= payout;

        if (releaseToContributor) {
            m.status = MilestoneStatus.Released;
            (bool success, ) = project.contributor.call{value: payout}("");
            require(success, "Transfer failed");
        } else {
            m.status = MilestoneStatus.Refunded;
            (bool success, ) = project.client.call{value: payout}("");
            require(success, "Refund failed");
        }

        emit DisputeResolved(projectId, milestoneIndex, releaseToContributor);
    }

    // --- MULTI-PARTY EXPENSE SHARING ---

    /**
     * @notice Create a collaborative expense sharing pool with pro-rata payee splits
     * @param payees Addresses of contributors to reimburse
     * @param shareBps Basis points split (sum must equal 10,000 = 100%)
     */
    function createExpensePool(
        string calldata title,
        string calldata receiptHash,
        address[] calldata payees,
        uint256[] calldata shareBps
    ) external payable returns (uint256) {
        require(msg.value > 0, "Expense pool must be funded");
        require(payees.length > 0 && payees.length == shareBps.length, "Invalid payees or splits");

        uint256 totalBps = 0;
        for (uint256 i = 0; i < shareBps.length; i++) {
            totalBps += shareBps[i];
            require(payees[i] != address(0), "Invalid payee address");
        }
        require(totalBps == 10_000, "Splits must sum to 10000 bps (100%)");

        expenseCounter++;
        uint256 xid = expenseCounter;

        expensePools[xid] = ExpensePool({
            id: xid,
            creator: msg.sender,
            title: title,
            receiptHash: receiptHash,
            totalFunded: msg.value,
            payees: payees,
            shareBps: shareBps,
            approved: false,
            disbursed: false
        });

        emit ExpensePoolCreated(xid, msg.sender, title, msg.value);
        return xid;
    }

    /**
     * @notice Disburse funds automatically to all payees according to basis points
     */
    function approveAndDisburseExpense(uint256 poolId) external nonReentrant {
        ExpensePool storage pool = expensePools[poolId];
        require(pool.id != 0, "Pool does not exist");
        require(!pool.disbursed, "Already disbursed");
        require(msg.sender == pool.creator || msg.sender == owner(), "Unauthorized");

        pool.approved = true;
        pool.disbursed = true;

        uint256 total = pool.totalFunded;
        for (uint256 i = 0; i < pool.payees.length; i++) {
            uint256 amount = (total * pool.shareBps[i]) / 10_000;
            if (amount > 0) {
                (bool success, ) = pool.payees[i].call{value: amount}("");
                require(success, "Payee transfer failed");
            }
        }

        emit ExpenseDisbursed(poolId, total);
    }

    function getExpensePool(uint256 poolId) external view returns (ExpensePool memory) {
        return expensePools[poolId];
    }

    // --- ROLE-BASED TASK BOUNTIES ---

    function createBounty(
        string calldata title,
        string calldata requiredRole,
        uint256 deadline
    ) external payable returns (uint256) {
        require(msg.value > 0, "Reward must be > 0");
        require(deadline > block.timestamp, "Deadline must be future");

        bountyCounter++;
        uint256 bid = bountyCounter;

        bounties[bid] = TaskBounty({
            id: bid,
            creator: msg.sender,
            claimant: address(0),
            title: title,
            requiredRole: requiredRole,
            rewardAmount: msg.value,
            deadline: deadline,
            status: BountyStatus.Open,
            submissionHash: ""
        });

        emit BountyCreated(bid, msg.sender, title, msg.value);
        return bid;
    }

    function claimBounty(uint256 bountyId) external {
        TaskBounty storage b = bounties[bountyId];
        require(b.id != 0, "Bounty does not exist");
        require(b.status == BountyStatus.Open, "Bounty not open");
        require(block.timestamp < b.deadline, "Bounty expired");

        b.claimant = msg.sender;
        b.status = BountyStatus.Claimed;

        emit BountyClaimed(bountyId, msg.sender);
    }

    function submitBountyWork(uint256 bountyId, string calldata submissionHash) external {
        TaskBounty storage b = bounties[bountyId];
        require(b.claimant == msg.sender, "Only claimant can submit");
        require(b.status == BountyStatus.Claimed, "Not claimed");
        require(bytes(submissionHash).length > 0, "Empty submission hash");

        b.submissionHash = submissionHash;
        b.status = BountyStatus.Submitted;

        emit BountySubmitted(bountyId, msg.sender, submissionHash);
    }

    function approveBounty(uint256 bountyId) external nonReentrant {
        TaskBounty storage b = bounties[bountyId];
        require(msg.sender == b.creator || msg.sender == owner(), "Unauthorized");
        require(b.status == BountyStatus.Submitted, "Work not submitted");

        b.status = BountyStatus.Completed;
        uint256 reward = b.rewardAmount;

        (bool success, ) = b.claimant.call{value: reward}("");
        require(success, "Payout failed");

        emit BountyApproved(bountyId, b.claimant, reward);
    }

    // --- CONTINUOUS STREAMING PAYROLL ---

    function createPayrollStream(address recipient, uint256 stopTime) external payable returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(stopTime > block.timestamp, "Invalid stop time");
        require(msg.value > 0, "Deposit must be > 0");

        uint256 duration = stopTime - block.timestamp;
        uint256 rate = msg.value / duration;
        require(rate > 0, "Rate too low");

        streamCounter++;
        uint256 sid = streamCounter;

        streams[sid] = PayrollStream({
            id: sid,
            employer: msg.sender,
            recipient: recipient,
            ratePerSecond: rate,
            startTime: block.timestamp,
            stopTime: stopTime,
            totalDeposited: msg.value,
            totalWithdrawn: 0,
            active: true
        });

        emit StreamCreated(sid, msg.sender, recipient, rate);
        return sid;
    }

    function getStreamBalance(uint256 streamId) public view returns (uint256) {
        PayrollStream storage s = streams[streamId];
        if (!s.active) return 0;

        uint256 effectiveEnd = block.timestamp < s.stopTime ? block.timestamp : s.stopTime;
        if (effectiveEnd <= s.startTime) return 0;

        uint256 elapsed = effectiveEnd - s.startTime;
        uint256 totalAccrued = elapsed * s.ratePerSecond;
        if (totalAccrued > s.totalDeposited) {
            totalAccrued = s.totalDeposited;
        }

        if (totalAccrued <= s.totalWithdrawn) return 0;
        return totalAccrued - s.totalWithdrawn;
    }

    function withdrawStream(uint256 streamId) external nonReentrant {
        PayrollStream storage s = streams[streamId];
        require(msg.sender == s.recipient, "Only recipient can withdraw");
        uint256 claimable = getStreamBalance(streamId);
        require(claimable > 0, "No funds available to withdraw");

        s.totalWithdrawn += claimable;

        (bool success, ) = s.recipient.call{value: claimable}("");
        require(success, "Transfer failed");

        emit StreamWithdrawal(streamId, s.recipient, claimable);
    }
}
