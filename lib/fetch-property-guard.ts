/** 物件URL取得APIで許可するホスト（サフィックス一致） */
const ALLOWED_HOST_SUFFIXES = [
  "athome.co.jp",
  "rakumachi.jp",
  "suumo.jp",
  "ieichiba.com",
  "zero-yen.com",
  "0yen.jp",
  "chintai.net",
  "homes.co.jp",
  "kenbiya.com",
  "chukai.net",
  "reins.jp",
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

export function validatePropertyFetchUrl(
  urlStr: string
): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(urlStr.trim());
  } catch {
    return { ok: false, error: "URLの形式が正しくありません" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "http または https のURLのみ利用できます" };
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || isPrivateIpv4(host)) {
    return { ok: false, error: "このURLは取得できません" };
  }

  const allowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
  if (!allowed) {
    return {
      ok: false,
      error: "対応していないサイトです（楽待・アットホーム・SUUMO等のみ）",
    };
  }

  return { ok: true, url };
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export function checkFetchRateLimit(clientKey: string): { ok: true } | { ok: false; error: string } {
  const now = Date.now();
  const bucket = rateBuckets.get(clientKey);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(clientKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT) {
    return { ok: false, error: "リクエスト上限に達しました。しばらく待ってから再試行してください" };
  }
  bucket.count += 1;
  return { ok: true };
}
