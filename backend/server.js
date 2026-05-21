const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

let firebaseAdminInitialized = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

if (projectId && clientEmail && privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    firebaseAdminInitialized = true;
    console.log('✅ [Firebase Admin] Initialized successfully via Environment Variables');
  } catch (error) {
    console.error('❌ [Firebase Admin] Initialization failed:', error.message);
  }
} else {
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseAdminInitialized = true;
    } catch (e) {
      console.log('⚠️ [Firebase Admin] Failed basic initialization:', e.message);
    }
  } else {
    console.log('⚠️ [Firebase Admin] Credentials not found in .env or service-account.json.');
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    firebaseAdminInitialized
  });
});

app.post('/api/didit/create-session', async (req, res) => {
  const { uid, workflowId, callback } = req.body;
  const apiKey = process.env.DIDIT_API_KEY || '9bIMDMRJiozzUVtDt9rdsM1Q5E7ow70tIqFavg2PNI0';
  const finalWorkflowId = workflowId || process.env.DIDIT_WORKFLOW_ID;

  if (!uid) {
    return res.status(400).json({ success: false, error: 'User UID is required' });
  }

  if (!finalWorkflowId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Didit Workflow ID is required. Please add it to your backend/.env file.' 
    });
  }

  try {
    console.log(`🚀 [Didit API] Creating verification session for uid: ${uid}`);
    const response = await axios.post(
      'https://verification.didit.me/v3/session/',
      {
        workflow_id: finalWorkflowId,
        vendor_data: uid,
        callback: callback || process.env.DIDIT_CALLBACK_URL || 'reblocks://kyc-complete'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      }
    );

    console.log('✅ [Didit API] Session created successfully:', response.data.session_id);
    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('❌ [Didit API] Session creation failed:', errorDetails);
    return res.status(500).json({ success: false, error: errorDetails });
  }
});

app.post('/api/didit/webhook', async (req, res) => {
  console.log('📥 [Didit Webhook] Received status update event:');
  console.log(JSON.stringify(req.body, null, 2));

  const dataObj = req.body.data || {};
  const statusRaw = dataObj.status || req.body.status;
  const vendorDataRaw = dataObj.vendor_data || req.body.vendor_data;
  const decisionObj = dataObj.decision || req.body.decision;

  const verificationStatus = statusRaw || (decisionObj ? decisionObj.status : null);
  const finalVendorData = vendorDataRaw;

  if (!finalVendorData) {
    console.log('⚠️ [Didit Webhook] Missing vendor_data (user UID). Event skipped.');
    return res.status(200).json({ success: true, message: 'Skipped - no vendor_data' });
  }

  console.log(`ℹ️ [Didit Webhook] User: ${finalVendorData} | Status: ${verificationStatus}`);

  // Use case-insensitive check for approved
  if (verificationStatus && verificationStatus.toLowerCase() === 'approved') {
    if (firebaseAdminInitialized) {
      try {
        const userRef = admin.firestore().collection('users').doc(finalVendorData);
        await userRef.update({
          isVerified: true,
          KYCVerified: true,
          kycVerifiedAt: new Date().toISOString()
        });
        console.log(`✅ [Didit Webhook] Firebase updated for user ${vendor_data}`);
        return res.status(200).json({ success: true, message: 'Webhook received and processed' });
      } catch (err) {
        console.error(`❌ [Didit Webhook] Failed to update Firebase for user ${vendor_data}:`, err);
        return res.status(500).json({ success: false, error: 'Firebase update failed' });
      }
    } else {
      console.error(`❌ [Didit Webhook] Firebase Admin not initialized. Cannot update user ${vendor_data}`);
      return res.status(500).json({ success: false, error: 'Firebase Admin not initialized' });
    }
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Webhook received and processed' 
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    firebaseInitialized: firebaseAdminInitialized 
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Reblocks Backend server is running on http://localhost:${PORT}`);
  console.log(`📡 Local Webhook endpoint: http://localhost:${PORT}/api/didit/webhook`);
});
