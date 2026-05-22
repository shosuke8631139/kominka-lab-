"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegister() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 登録失敗時はサイレント（開発環境等） */
      });
    }

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="bg-amber-100 border-b border-amber-300 text-amber-900 text-center text-xs py-2 px-4"
    >
      オフラインです。キャッシュ済みの画面と保存データは利用できます（URL取得・最新記事は不可）
    </div>
  );
}
