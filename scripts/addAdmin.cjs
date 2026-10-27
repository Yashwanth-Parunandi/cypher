#!/usr/bin/env node
// Usage:
//   node scripts/addAdmin.cjs <TARGET_ADDRESS>
// Requires .env with PRIVATE_KEY, VITE_CONTRACT_ADDRESS, VITE_RPC_URL

const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/addAdmin.cjs <TARGET_ADDRESS>');
    process.exit(1);
  }

  const rpcUrl = process.env.VITE_RPC_URL || 'http://127.0.0.1:7545';
  const contractAddress = process.env.VITE_CONTRACT_ADDRESS;
  const pk = process.env.PRIVATE_KEY;
  if (!contractAddress) throw new Error('VITE_CONTRACT_ADDRESS not set in .env');
  if (!pk) throw new Error('PRIVATE_KEY not set in .env');

  // Load ABI
  const abi = require('../src/contracts/CertVault.json');

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log(`Network: ${rpcUrl}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Owner (signer): ${await wallet.getAddress()}`);
  console.log(`Adding admin: ${target}`);

  try {
    const tx = await contract.addAdmin(target);
    console.log('Tx sent:', tx.hash);
    const rcpt = await tx.wait();
    console.log('Tx mined in block', rcpt.blockNumber, 'status', rcpt.status);
    console.log('✅ Admin added successfully');
  } catch (err) {
    console.error('❌ Failed to add admin:', err?.reason || err?.message || err);
    process.exit(1);
  }
}

main();
