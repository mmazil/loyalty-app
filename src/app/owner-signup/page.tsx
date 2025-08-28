"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";

export default function OwnerSignupPage() {
  const [shopName, setShopName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const router = useRouter();

  // Disable reCAPTCHA in development
  if (process.env.NODE_ENV === "development") {
    auth.settings.appVerificationDisabledForTesting = true;
  }

  // Initialize invisible reCAPTCHA
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
    const uid = result.user.uid;

    // Create user document with owner:true
    await setDoc(doc(db, "users", uid), {
      phoneNumber,
      owner: true,
      createdAt: serverTimestamp(),
    });

    // Create shop document
    const shopId = uuidv4();
    await setDoc(doc(db, "shops", shopId), {
      name: shopName,
      createdAt: serverTimestamp(),
    });

    // Add owner to shop owners subcollection
    await setDoc(doc(db, "shops", shopId, "owners", uid), {
      role: "owner",
      addedAt: serverTimestamp(),
    });

    router.push(`/dashboard?shopId=${shopId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <div id="recaptcha-container"></div>
      <h1 className="text-2xl font-bold mb-6 text-center">
        Register Coffee Shop
      </h1>

      <input
        type="text"
        placeholder="Shop Name"
        value={shopName}
        onChange={(e) => setShopName(e.target.value)}
        className="w-full max-w-sm p-3 mb-4 rounded bg-gray-900 text-white border border-gray-700 placeholder-gray-400"
      />
      <input
        type="tel"
        placeholder="Owner Phone Number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="w-full max-w-sm p-3 mb-4 rounded bg-gray-900 text-white border border-gray-700 placeholder-gray-400"
      />

      {!confirmationResult ? (
        <button
          onClick={handleSendOtp}
          className="w-full max-w-sm py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mb-4"
        >
          Send OTP
        </button>
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
            Verify & Create Shop
          </button>
        </>
      )}
    </div>
  );
}
