const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  // Deploying the Escrow contract passing the deployer as the platform owner
  const SupplyChainEscrow = await hre.ethers.getContractFactory("SupplyChainEscrow");
  const escrow = await SupplyChainEscrow.deploy(deployer.address);
  
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  
  console.log("SupplyChainEscrow deployed to:", contractAddress);

  // Save the address and ABI to backend/blockchain/contract.json
  const artifact = await hre.artifacts.readArtifact("SupplyChainEscrow");
  const contractData = {
    address: contractAddress,
    abi: artifact.abi
  };

  const blockchainDir = path.join(__dirname, "..", "blockchain");
  if (!fs.existsSync(blockchainDir)) {
    fs.mkdirSync(blockchainDir, { recursive: true });
  }

  const contractPath = path.join(blockchainDir, "contract.json");
  fs.writeFileSync(contractPath, JSON.stringify(contractData, null, 2));
  console.log("Saved contract ABI and address to:", contractPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
