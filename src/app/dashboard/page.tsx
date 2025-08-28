"use client";

import { useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";

export default function Dashboard() {
  const params = useSearchParams();
  const shopId = params.get("shopId");

  if (!shopId) return <p>No shop found.</p>;

  const qrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/scan?shopId=${shopId}`
      : `/scan?shopId=${shopId}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Shop Dashboard</h1>
      <p className="mb-4">Shop ID: {shopId}</p>
      <QRCode value={qrValue} size={200} />
      <p className="mt-2 text-gray-500">Shop QR code</p>
    </div>
  );
}
