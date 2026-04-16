const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const SupplyChainEscrow = await hre.ethers.getContractFactory("SupplyChainEscrow");
  const escrow = await SupplyChainEscrow.deploy(deployer.address);
  
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  
  console.log("SupplyChainEscrow deployed to:", contractAddress);

  const artifact = await hre.artifacts.readArtifact("SupplyChainEscrow");
  const contractData = {
    address: contractAddress,
    abi: artifact.abi
  };

  const blockchainDir = path.resolve(__dirname, "../../backend/blockchain");
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
