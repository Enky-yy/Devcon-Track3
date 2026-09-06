import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Starting deployment of Axiom Protocol...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  // 1. Deploy AxiomGovernance
  const AxiomGov = await ethers.getContractFactory("AxiomGovernance");
  const governance = await AxiomGov.deploy();
  await governance.waitForDeployment();
  const govAddress = await governance.getAddress();
  console.log(`[+] AxiomGovernance deployed to: ${govAddress}`);

  // 2. Deploy AxiomEscrowBounties
  const AxiomEscrow = await ethers.getContractFactory("AxiomEscrowBounties");
  const escrow = await AxiomEscrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`[+] AxiomEscrowBounties deployed to: ${escrowAddress}`);

  // 3. Deploy AxiomProvenanceRegistry
  const AxiomRegistry = await ethers.getContractFactory("AxiomProvenanceRegistry");
  const provenance = await AxiomRegistry.deploy();
  await provenance.waitForDeployment();
  const provenanceAddress = await provenance.getAddress();
  console.log(`[+] AxiomProvenanceRegistry deployed to: ${provenanceAddress}`);

  // 4. Deploy AxiomTransparencyLog
  const AxiomLog = await ethers.getContractFactory("AxiomTransparencyLog");
  const transparency = await AxiomLog.deploy();
  await transparency.waitForDeployment();
  const transparencyAddress = await transparency.getAddress();
  console.log(`[+] AxiomTransparencyLog deployed to: ${transparencyAddress}`);

  // Export contract addresses and ABIs for frontend
  const deployments = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contracts: {
      AxiomGovernance: govAddress,
      AxiomEscrowBounties: escrowAddress,
      AxiomProvenanceRegistry: provenanceAddress,
      AxiomTransparencyLog: transparencyAddress,
    },
  };

  const exportDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(exportDir, "deployments.json"),
    JSON.stringify(deployments, null, 2)
  );

  // Copy ABIs
  const artifacts = [
    { name: "AxiomGovernance", path: "contracts/governance/AxiomGovernance.sol/AxiomGovernance.json" },
    { name: "AxiomEscrowBounties", path: "contracts/escrow/AxiomEscrowBounties.sol/AxiomEscrowBounties.json" },
    { name: "AxiomProvenanceRegistry", path: "contracts/provenance/AxiomProvenanceRegistry.sol/AxiomProvenanceRegistry.json" },
    { name: "AxiomTransparencyLog", path: "contracts/provenance/AxiomTransparencyLog.sol/AxiomTransparencyLog.json" },
  ];

  for (const art of artifacts) {
    const srcPath = path.join(__dirname, "../artifacts", art.path);
    if (fs.existsSync(srcPath)) {
      const artifactJson = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
      fs.writeFileSync(
        path.join(exportDir, `${art.name}.json`),
        JSON.stringify({ abi: artifactJson.abi }, null, 2)
      );
    }
  }

  console.log("Deployment manifest & ABIs exported to frontend/src/contracts/");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
