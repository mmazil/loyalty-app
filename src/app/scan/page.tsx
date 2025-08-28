"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const dynamic = "force-dynamic"; // 🚫 disable prerendering

function ScanContent() {
  const params = useSearchParams();
  const router = useRouter();
  const shopId = params.get("shopId");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(`/shop?shopId=${shopId}`);
      } else {
        router.replace(`/login?shopId=${shopId}`);
      }
    });
    return () => unsubscribe();
  }, [router, shopId]);

  return (
    <p className="text-center mt-10 text-gray-400">
      Checking authentication...
    </p>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScanContent />
    </Suspense>
  );
}
