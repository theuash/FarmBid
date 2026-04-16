const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function getContractData() {
  try {
    const dataPath = path.join(__dirname, "contract.json");
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, "utf8"));
    }
  } catch (error) {
    console.warn("Could not read contract.json - run deployment script first.");
  }
  return { address: null, abi: null };
}

let provider = null;
let platformWallet = null;
let contractWithPlatform = null;

function initBlockchain() {
  if (contractWithPlatform) return; 
  
  const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL;
  const privateKey = process.env.PLATFORM_PRIVATE_KEY;
  const { address, abi } = getContractData();

  if (!rpcUrl || !privateKey || !address || !abi) {
    console.warn("Blockchain config incomplete. Escrow on-chain features may fail.");
    return;
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  platformWallet = new ethers.Wallet(privateKey, provider);
  contractWithPlatform = new ethers.Contract(address, abi, platformWallet);
}

// Ensure it initializes
initBlockchain();

async function lockFunds(orderId, farmerAddress, amountMATIC) {
  try {
    const { address, abi } = getContractData();
    if (!address || !abi) throw new Error("Contract definition not found.");
    
    // In actual implementation, lockFunds is called by the BUYER. 
    // Wait, the prompt says "Called when buyer wins an auction and confirms payment. Body: { orderId, farmerAddress, amountMATIC } - Calls escrowService.lockFunds()"
    // A centralized web2 app typically takes payment somehow or uses the user's wallet.
    // If the platform pays to lock, use platformWallet. If buyer uses a local wallet for the prototype, we create an ephemeral one or also use platformWallet as a proxy.
    // Wait! The user said: "The approveRelease, penalizeFarmer, penalizeBuyer functions are called by the platform wallet — make sure the service uses PLATFORM_PRIVATE_KEY". 
    // They did not specify lockFunds should be called by the platform wallet, but wait, the API simply takes `amountMATIC` and we assume the backend executes it.
    // Actually, "lockFunds(orderId, farmerAddress) — payable, called by buyer to lock MATIC". In this backend, it might be the backend executing it on behalf of the buyer using a buyer private key OR using the platform wallet as a stand-in for testing. Let's use the platform wallet for this simplified backend API implementation but leave a note or just perform the call.
    // Let's use a dynamic wallet or the platform wallet if buyer key isn't provided. I'll just use the platformWallet for ease of testing based on the constraints. Wait, the constraints only say "The approveRelease... functions are called by the platform wallet". Let's assume `lockFunds` is called by the platform acting as the buyer here because it's a backend endpoint handling it.
    
    // Wait! The prompt says: "use a platform wallet from env: PLATFORM_PRIVATE_KEY". "Each function should... Use a platform wallet from env: PLATFORM_PRIVATE_KEY".
    // I will use platformWallet for all.
    
    const amountStr = amountMATIC.toString();
    const value = ethers.parseEther(amountStr);
    
    const tx = await contractWithPlatform.lockFunds(orderId, farmerAddress, { value });
    console.log(`[lockFunds] Transaction hash: ${tx.hash}`);
    await tx.wait();
    
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error(`[lockFunds] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function approveRelease(orderId) {
  try {
    const tx = await contractWithPlatform.approveRelease(orderId);
    console.log(`[approveRelease] Transaction hash: ${tx.hash}`);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error(`[approveRelease] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function penalizeFarmer(orderId) {
  try {
    const tx = await contractWithPlatform.penalizeFarmer(orderId);
    console.log(`[penalizeFarmer] Transaction hash: ${tx.hash}`);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error(`[penalizeFarmer] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function penalizeBuyer(orderId) {
  try {
    const tx = await contractWithPlatform.penalizeBuyer(orderId);
    console.log(`[penalizeBuyer] Transaction hash: ${tx.hash}`);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error(`[penalizeBuyer] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getOrderStatus(orderId) {
  try {
    initBlockchain(); // ensure it's initialized if called right away
    const order = await contractWithPlatform.orders(orderId);
    
    // orders returns an array-like object or proxy where totalAmount, farmer, etc are accessible
    
    return { 
      success: true, 
      data: {
        amount: ethers.formatEther(order[0]), // order.totalAmount
        farmer: order[1], // order.farmer
        transporter: order[2], // order.transporter
        buyer: order[3], // order.buyer
        deliveryConfirmed: order[4],
        escrowReleased: order[5],
        status: order[5] ? "COMPLETE" : (order[4] ? "AWAITING_RELEASE" : "LOCKED")
      }
    };
  } catch (error) {
    console.error(`[getOrderStatus] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  lockFunds,
  approveRelease,
  penalizeFarmer,
  penalizeBuyer,
  getOrderStatus
};
