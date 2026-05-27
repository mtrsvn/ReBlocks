require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const axios = require("axios");
const admin = require("firebase-admin");

let db = null;
let provider = null;
let wallet = null;
let usdtContract = null;

const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];
let USDT_ADDRESS = "0x1234567890123456789012345678901234567890";

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to securely get env variables (fallback for local system)
app.get("/api/env", (req, res) => {
  const syncToken = process.env.SYSTEM_SYNC_TOKEN;
  const authHeader = req.headers.authorization;

  if (!syncToken || authHeader !== `Bearer ${syncToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({
    DIDIT_API_KEY: process.env.DIDIT_API_KEY,
    DIDIT_CALLBACK_URL: process.env.DIDIT_CALLBACK_URL,
    DIDIT_WORKFLOW_ID: process.env.DIDIT_WORKFLOW_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    TEST_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY,
    USDT_ADDRESS: process.env.USDT_ADDRESS,
  });
});

async function init() {
  const requiredKeys = [
    "DIDIT_API_KEY",
    "DIDIT_CALLBACK_URL",
    "DIDIT_WORKFLOW_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_PROJECT_ID",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "TEST_PRIVATE_KEY",
    "USDT_ADDRESS"
  ];

  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  if (missingKeys.length > 0) {
    console.log(`[Env Bootstrap] Missing local environment keys: ${missingKeys.join(", ")}`);
    console.log("[Env Bootstrap] Attempting to fetch environment from https://reblocks.onrender.com/api/env...");
    try {
      const headers = {};
      if (process.env.SYSTEM_SYNC_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.SYSTEM_SYNC_TOKEN}`;
      }
      const response = await axios.get("https://reblocks.onrender.com/api/env", { headers, timeout: 8000 });
      if (response.data) {
        requiredKeys.forEach(key => {
          if (!process.env[key] && response.data[key]) {
            process.env[key] = response.data[key];
          }
        });
        console.log("[Env Bootstrap] Successfully synced environment from production Render server.");
      }
    } catch (err) {
      console.warn("[Env Bootstrap] Could not load environment from production Render (will use local .env if available):", err.message);
    }
  }

  // Initialize Firebase Admin SDK after env load
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      db = admin.firestore();
      console.log("Firebase Admin successfully initialized.");
    } catch (err) {
      console.error("Error initializing Firebase Admin:", err);
    }
  } else {
    console.warn("Firebase Admin credentials not fully configured in environment.");
  }

  // Morph L2 Testnet Provider (Hoodi)
  provider = new ethers.JsonRpcProvider("https://rpc-hoodi.morph.network");

  const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;
  if (PRIVATE_KEY) {
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    USDT_ADDRESS = process.env.USDT_ADDRESS || "0x1234567890123456789012345678901234567890";
    usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);
  }
}

const initPromise = init().catch(err => {
  console.error("Error running server startup initialization:", err);
});

app.post("/api/dispatch-tx", async (req, res) => {
  await initPromise;
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
  await initPromise;
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
  await initPromise;
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

    const sessionId = response.data.session_id;
    console.log(`Didit Session Created Successfully for UID: ${uid}, Session ID: ${sessionId}`);

    // Store the session ID in Firestore
    if (db) {
      try {
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
          kycSessionId: sessionId,
          kycStatus: "CREATED",
        });
        console.log(`Saved kycSessionId for user ${uid} in Firestore.`);
      } catch (fsErr) {
        console.error("Failed to update user profile with kycSessionId in Firestore:", fsErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        url: response.data.url,
        session_id: sessionId,
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
  await initPromise;
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
    const currentStatus = decision.status || "PENDING";
    console.log(`Didit verification decision status for session ${session_id}: ${currentStatus}`);

    const isApproved = currentStatus === "APPROVED" || currentStatus === "Approved";

    if (db) {
      try {
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
          kycStatus: currentStatus,
          KYCVerified: isApproved,
          isVerified: isApproved // Update both fields for safety
        });
        console.log(`Updated Firestore user ${uid}: KYCVerified = ${isApproved}, kycStatus = ${currentStatus}`);
      } catch (fsErr) {
        console.error("Failed to update user profile verification status in Firestore:", fsErr.message);
      }
    }

    return res.json({ success: true, verified: isApproved, status: currentStatus });
  } catch (error) {
    console.error("Error verifying Didit session:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || "Failed to verify session decision status",
    });
  }
});

// Didit Webhook endpoint to automatically process dashboard approvals/rejections
app.post("/api/didit/webhook", async (req, res) => {
  await initPromise;
  try {
    const payload = req.body;
    console.log("Received Didit Webhook Event payload:", JSON.stringify(payload));

    const sessionId = payload.session_id || payload.data?.session_id || payload.id;
    const status = payload.status || payload.data?.status || payload.decision?.status;

    if (!sessionId) {
      console.warn("[Webhook Warning] Received webhook with no identifiable session_id.");
      return res.status(400).json({ success: false, error: "Missing session_id in payload" });
    }

    const isApproved = status === "APPROVED" || status === "Approved";
    console.log(`[Webhook] Processing webhook for session: ${sessionId}. Status: ${status} (isApproved: ${isApproved})`);

    if (db) {
      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("kycSessionId", "==", sessionId).get();

      if (snapshot.empty) {
        console.log(`[Webhook] No user found matching kycSessionId: ${sessionId}`);
        return res.status(404).json({ success: false, message: "No matching user found for session" });
      }

      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          kycStatus: status,
          KYCVerified: isApproved,
          isVerified: isApproved
        });
        console.log(`[Webhook Batch] Preparing update for user: ${doc.id}`);
      });

      await batch.commit();
      console.log(`[Webhook Success] Successfully updated all user profile matches in Firestore for session: ${sessionId}`);
    } else {
      console.warn("[Webhook Warning] Firestore db not available to process webhook.");
    }

    res.json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("[Webhook Error] Error processing Didit Webhook:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Stateless Node.js bridge running on port ${PORT}`);
  console.log(
    `Connected to Morph L2 Testnet RPC: https://rpc-hoodi.morph.network`,
  );
});
