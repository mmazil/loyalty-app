"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  User,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { ConfirmationResult } from "firebase/auth";

export const dynamic = "force-dynamic"; // 🚫 disable prerendering

function RedeemContent() {
  const params = useSearchParams();
  const userId = params.get("userId") || params.get("userID");
  const shopId = params.get("shopId");

  const [owner, setOwner] = useState<User | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  if (process.env.NODE_ENV === "development") {
    auth.settings.appVerificationDisabledForTesting = true;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
  }, []);

  // Owner login listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setOwner(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || !userSnap.data().owner) {
        alert("This account is not authorized as an owner.");
        await signOut(auth);
        setOwner(null);
        setLoading(false);
        return;
      }

      setOwner(user);
      if (userId && shopId) {
        await fetchUserPoints();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId, shopId]);

  const fetchUserPoints = async () => {
    setLoading(true);
    const userRef = doc(db, "users", userId!);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setPoints(userSnap.data().points?.[shopId!] || 0);
      setUserPhone(userSnap.data().phoneNumber || null);
    } else {
      setPoints(0);
      setUserPhone(null);
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!window.recaptchaVerifier) return;
    const confirmation = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      window.recaptchaVerifier
    );
    setConfirmationResult(confirmation);
    alert("OTP sent!");
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) return;
    const result = await confirmationResult.confirm(otpCode);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().owner) {
      alert("This account is not authorized as an owner.");
      await signOut(auth);
      setOwner(null);
      return;
    }

    setOwner(result.user);
    setOtpCode("");
  };

  const updatePoints = async (amount: number) => {
    if (!owner || !userId || !shopId) return;

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const currentPoints = userSnap.exists()
      ? userSnap.data().points?.[shopId!] || 0
      : 0;

    await updateDoc(userRef, { [`points.${shopId}`]: currentPoints + amount });
    setPoints(currentPoints + amount);
  };

  const redeemPoint = async () => {
    if (points && points >= 100) {
      await updatePoints(-100);
      alert("Points redeemed successfully!");
    } else {
      alert("Not enough points to redeem.");
    }
  };

  // Login screen
  if (!owner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
        <div id="recaptcha-container"></div>
        <h1 className="text-2xl font-bold mb-6 text-center">Owner Login</h1>
        {!confirmationResult ? (
          <>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full max-w-sm p-3 mb-4 rounded bg-gray-900 text-white border border-gray-700 placeholder-gray-400"
            />
            <button
              onClick={handleSendOtp}
              className="w-full max-w-sm py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mb-4"
            >
              Send OTP
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full max-w-sm p-3 mb-4 rounded bg-gray-900 text-white border border-gray-700 placeholder-gray-400"
            />
            <button
              onClick={handleVerifyOtp}
              className="w-full max-w-sm py-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Verify
            </button>
          </>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading...
      </div>
    );
  }

  // Owner view
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <h1 className="text-2xl font-bold mb-4">
        User Phone: {userPhone || "Unknown"}
      </h1>
      <p className="mb-6 text-xl font-semibold">Current Points: {points}</p>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={() => updatePoints(1)}
          className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition-colors"
        >
          Add Point
        </button>
        <button
          onClick={redeemPoint}
          disabled={points === 0}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded hover:bg-red-700 disabled:bg-gray-700 transition-colors"
        >
          Redeem Point
        </button>
      </div>
      {/* <button
        onClick={async () => {
          await signOut(auth);
          setOwner(null);
        }}
        className="w-full max-w-sm bg-red-500 text-white px-6 py-3 rounded hover:bg-red-600 transition-colors mt-10"
      >
        Logout
      </button> */}
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RedeemContent />
    </Suspense>
  );
}
