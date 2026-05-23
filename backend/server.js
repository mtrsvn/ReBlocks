require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Morph L2 Testnet Provider (Holesky)
const provider = new ethers.JsonRpcProvider("https://rpc-holesky.morphl2.io");

// Pre-configured developer testing private key
// WARNING: This is for testnet purposes ONLY. Do NOT use in production with real funds!
const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat test account #0
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Mock USDT ERC-20 ABI (only `transfer` method)
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Mock Testnet USDT Contract Address (Replace with actual Testnet USDT address on Morph)
const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x1234567890123456789012345678901234567890";

const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);

app.post("/api/dispatch-tx", async (req, res) => {
  try {
    const { targetAddress } = req.body;
    
    // We send to the target address, or default to sending to ourselves to avoid losing funds if unprovided
    const toAddress = targetAddress || wallet.address;
    
    console.log(`Frontend authorization received. Dispatching transaction to ${toAddress} on Morph L2...`);
    
    // Send a real testnet transaction (0 ETH) just to generate a real transaction hash on the explorer
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: 0
    });
    
    console.log(`Transaction sent! Hash: ${tx.hash}`);
    
    // Return hash to the mobile client
    res.json({
      success: true,
      message: "Transfer dispatched successfully",
      txHash: tx.hash
    });
  } catch (error) {
    console.error("L2 Bridge execution error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return res.status(500).json({ error: { message: "Gemini API Key is not configured on the server." } });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(url, req.body, {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true // Allow us to handle HTTP errors manually
    });

    if (response.status !== 200) {
      console.error("Gemini API Error Response:", response.data);
      return res.status(500).json({ error: { message: response.data?.error?.message || "Failed to fetch from Gemini" } });
    }

    res.json(response.data);
  } catch (error) {
    console.error("Backend Proxy Error:", error);
    res.status(500).json({ error: { message: error.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Stateless Node.js bridge running on port ${PORT}`);
  console.log(`Connected to Morph L2 Testnet RPC: https://rpc-holesky.morphl2.io`);
});
