"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import type { ConfirmationResult } from "firebase/auth";

export const dynamic = "force-dynamic"; // 🚫 disable prerendering

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const shopId = params.get("shopId");
  const { user, loading } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("+33757445666");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [code, setCode] = useState("123456");

  // Disable reCAPTCHA in development
  if (process.env.NODE_ENV === "development") {
    auth.settings.appVerificationDisabledForTesting = true;
  }

  const sendOTP = async () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      window.recaptchaVerifier
    );
    setConfirmation(confirmationResult);
  };

  const verifyCode = async () => {
    if (!confirmation) return;
    const result = await confirmation.confirm(code);
    const uid = result.user.uid;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        phoneNumber: result.user.phoneNumber,
        points: { [shopId!]: 0 },
      });
    } else {
      const userData = userSnap.data();
      if (!userData.points || !(shopId! in userData.points)) {
        await updateDoc(userRef, { [`points.${shopId!}`]: 0 });
      }
    }

    router.replace(`/shop?shopId=${shopId}`);
  };

  useEffect(() => {
    if (!loading && user) {
      router.push(`/shop?shopId=${shopId}`);
    }
  }, [user, loading, router, shopId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
      <div className="w-full max-w-sm p-6 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-white text-center">
          Login
        </h1>

        {!confirmation ? (
          <>
            <input
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="+123456789"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <button
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={sendOTP}
            >
              Send code via SMS
            </button>
          </>
        ) : (
          <>
            <input
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              placeholder="Enter Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={verifyCode}
            >
              Verify
            </button>
          </>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
