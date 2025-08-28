"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import QRCode from "react-qr-code";

export default function CoffeePage() {
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const shopId = params.get("shopId");

  const [points, setPoints] = useState<number>(0);
  const [shopName, setShopName] = useState<string>("");

  // Fetch shop name
  useEffect(() => {
    if (!shopId) return;
    const fetchShopName = async () => {
      const shopRef = doc(db, "shops", shopId);
      const shopSnap = await getDoc(shopRef);
      if (shopSnap.exists()) {
        setShopName(shopSnap.data().name || "");
      }
    };
    fetchShopName();
  }, [shopId]);

  // Listen to user's points for this shop in Firestore
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists() && shopId) {
        const data = snapshot.data();
        setPoints(data.points?.[shopId] || 0);
      } else {
        setPoints(0);
      }
    });

    return () => unsubscribe();
  }, [user, shopId]);

  const handleOpenCamera = () => {
    alert("📷 Open camera to scan QR code");
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!user)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Scan your coffee QR code
        </h1>
        <p className="mb-6 text-center text-gray-400">
          Open your camera and scan the QR code on the table to start collecting
          points.
        </p>
        <button
          onClick={handleOpenCamera}
          className="w-full max-w-xs py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Camera
        </button>
      </div>
    );

  const qrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/redeem?userId=${user.uid}&shopId=${shopId}`
      : `/redeem?userId=${user.uid}&shopId=${shopId}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Welcome to {shopName || "Coffee Shop"}
      </h1>
      <p className="mb-2 text-gray-400 text-center">
        Logged in as <span className="font-mono">{user.phoneNumber}</span>
      </p>
      <p className="mb-6 text-xl font-semibold text-green-400">
        Points: {points}
      </p>

      {/* QR Code for this user */}
      <div className="bg-white p-4 rounded-xl shadow-lg">
        <QRCode value={qrValue} size={180} />
      </div>

      {/* <button
        onClick={handleLogout}
        className="w-full max-w-xs py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mt-10"
      >
        Logout
      </button> */}
    </div>
  );
}
