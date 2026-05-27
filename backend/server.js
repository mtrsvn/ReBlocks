require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Morph L2 Testnet Provider (Hoodi)
const provider = new ethers.JsonRpcProvider("https://rpc-hoodi.morph.network");

const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Mock Testnet USDT Contract Address (Replace with actual Testnet USDT address on Morph)
const USDT_ADDRESS =
  process.env.USDT_ADDRESS || "0x1234567890123456789012345678901234567890";

const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);

app.post("/api/dispatch-tx", async (req, res) => {
  try {
    const { targetAddress } = req.body;

    // We send to the target address, or default to sending to ourselves to avoid losing funds if unprovided
    const toAddress = targetAddress || wallet.address;

    console.log(
      `Frontend authorization received. Dispatching transaction to ${toAddress} on Morph L2...`,
    );

    // Send a real ERC-20 transfer using the Mock USDT contract
    // We send a fixed amount (e.g. 10 USDT) for the mock, but you can pass it from the frontend
    const amountToSend = ethers.parseUnits("10", 6); // 10 USDT (6 decimals)
    const tx = await usdtContract.transfer(toAddress, amountToSend);

    console.log(`Transaction sent! Hash: ${tx.hash}`);

    // Return hash to the mobile client
    res.json({
      success: true,
      message: "Transfer dispatched successfully",
      txHash: tx.hash,
    });
  } catch (error) {
    console.error("L2 Bridge execution error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/didit/create-session", async (req, res) => {
  try {
    const { uid, callback } = req.body;
    console.log(`Didit KYC verification session request: uid=${uid}, callback=${callback}`);
    
    // Create an interactive, stylized mock verification URL that redirects back to the callback
    const sessionUrl = `https://reblocks.onrender.com/verify-mock?uid=${uid}&callback=${encodeURIComponent(callback)}`;
    
    res.json({
      success: true,
      data: {
        url: sessionUrl
      }
    });
  } catch (error) {
    console.error("Didit session creation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/verify-mock", (req, res) => {
  const { callback, uid } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ReBlocks Identity Verification</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .logo {
          font-size: 28px;
          font-weight: 800;
          color: #10B981;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 12px;
          font-weight: 800;
        }
        p {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        .btn:active {
          transform: translateY(0);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">ReBlocks</div>
        <h1>Identity Verification</h1>
        <p>Complete your decentralized biometric and document scan. Tap the button below to authorize and return to your app.</p>
        <button class="btn" onclick="window.location.href='${callback}'">Complete Verification</button>
      </div>
    </body>
    </html>
  `);
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return res.status(500).json({
        error: { message: "Gemini API Key is not configured on the server." },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(url, req.body, {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true, // Allow us to handle HTTP errors manually
    });

    if (response.status !== 200) {
      console.error("Gemini API Error Response:", response.data);
      return res.status(500).json({
        error: {
          message:
            response.data?.error?.message || "Failed to fetch from Gemini",
        },
      });
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
  console.log(
    `Connected to Morph L2 Testnet RPC: https://rpc-hoodi.morph.network`,
  );
});
