require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const axios = require("axios");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    // Replace literal newlines if private key is stored as string with escaped newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("Firebase Admin successfully initialized.");
  } catch (err) {
    console.error("Error initializing Firebase Admin:", err);
  }
} else {
  console.warn("Firebase Admin credentials not fully configured in environment.");
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

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

// Create Didit Verification Session
app.post("/api/didit/create-session", async (req, res) => {
  try {
    const { uid, callback } = req.body;
    if (!uid) {
      return res.status(400).json({ success: false, error: "Missing uid parameter" });
    }

    const API_KEY = process.env.DIDIT_API_KEY;
    const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
    const callbackUrl = callback || process.env.DIDIT_CALLBACK_URL || "reblocks://kyc-complete";

    if (!API_KEY || !WORKFLOW_ID) {
      console.error("Missing Didit API Key or Workflow ID in server configuration.");
      return res.status(500).json({ success: false, error: "Didit configuration missing on server" });
    }

    const url = "https://verification.didit.me/v3/session/";

    console.log(`Requesting Didit session creation for UID: ${uid}...`);
    const response = await axios.post(
      url,
      {
        workflow_id: WORKFLOW_ID,
        vendor_data: uid,
        callback: callbackUrl,
        callback_method: "both",
      },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Didit Session Created Successfully for UID: ${uid}`);
    res.json({
      success: true,
      data: {
        url: response.data.url,
        session_id: response.data.session_id,
      },
    });
  } catch (error) {
    console.error("Error creating Didit session:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || "Failed to create verification session",
    });
  }
});

// Verify Didit Session and update user in Firestore
app.post("/api/didit/verify-session", async (req, res) => {
  try {
    const { session_id, uid } = req.body;
    if (!session_id || !uid) {
      return res.status(400).json({ success: false, error: "Missing session_id or uid parameter" });
    }

    const API_KEY = process.env.DIDIT_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ success: false, error: "Didit API key is not configured on the server" });
    }

    const url = `https://verification.didit.me/v3/session/${session_id}/decision/`;

    console.log(`Fetching Didit decision status for session: ${session_id}...`);
    const response = await axios.get(url, {
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    const decision = response.data;
    console.log(`Didit verification decision status for session ${session_id}: ${decision.status}`);

    const isApproved = decision.status === "APPROVED" || decision.status === "Approved";

    if (isApproved) {
      if (db) {
        const userRef = db.collection("users").doc(uid);
        await userRef.update({ KYCVerified: true });
        console.log(`Successfully marked user profile ${uid} as KYCVerified: true in Firestore.`);
      } else {
        console.warn("Firestore db instance not initialized; skipped Firestore update.");
      }
      return res.json({ success: true, verified: true, status: decision.status });
    } else {
      return res.json({ success: true, verified: false, status: decision.status });
    }
  } catch (error) {
    console.error("Error verifying Didit session:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || "Failed to verify session decision status",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Stateless Node.js bridge running on port ${PORT}`);
  console.log(
    `Connected to Morph L2 Testnet RPC: https://rpc-hoodi.morph.network`,
  );
});
