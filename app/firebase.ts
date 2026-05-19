import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, browserLocalPersistence, Auth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDbmNV6984YozowmGc555QwYf4swCTCSTI",
  authDomain: "reblocks-6f729.firebaseapp.com",
  projectId: "reblocks-6f729",
  storageBucket: "reblocks-6f729.firebasestorage.app",
  messagingSenderId: "660082635334",
  appId: "1:660082635334:web:69dde8a9aa3188cc58d047",
  measurementId: "G-GVKK3LW3K4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  if (Platform.OS === 'web') {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
