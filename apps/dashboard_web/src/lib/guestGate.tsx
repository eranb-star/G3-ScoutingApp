import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type GuestGateState = {
  unlocked: boolean;
  unlock: (passcode: string) => boolean;
  lock: () => void;
};

const GuestGateCtx = createContext<GuestGateState | null>(null);

const LS_KEY = "g3_guest_unlocked_v1";
const LS_KEY_AT = "g3_guest_unlocked_at_v1";

// If you don’t set VITE_GUEST_PASSCODE, it will fall back to this default.
function getExpectedPasscode(): string {
  const env = (import.meta as any)?.env?.VITE_GUEST_PASSCODE;
  return String(env ?? "G36740").trim();
}

function readUnlocked(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeUnlocked(v: boolean) {
  try {
    localStorage.setItem(LS_KEY, v ? "1" : "0");
    if (v) localStorage.setItem(LS_KEY_AT, new Date().toISOString());
  } catch {
    // ignore
  }
}

export function GuestGateProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(() => readUnlocked());

  useEffect(() => {
    // keep state synced if storage changes (multi-tab / web)
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setUnlocked(readUnlocked());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<GuestGateState>(() => {
    return {
      unlocked,
      unlock: (passcode: string) => {
        const expected = getExpectedPasscode();
        const ok = String(passcode ?? "").trim() === expected;
        if (ok) {
          writeUnlocked(true);
          setUnlocked(true);
        }
        return ok;
      },
      lock: () => {
        writeUnlocked(false);
        setUnlocked(false);
      },
    };
  }, [unlocked]);

  return <GuestGateCtx.Provider value={api}>{children}</GuestGateCtx.Provider>;
}

export function useGuestGate() {
  const v = useContext(GuestGateCtx);
  if (!v) throw new Error("useGuestGate must be used within GuestGateProvider");
  return v;
}

/**
 * Full-screen overlay that blocks the app until passcode is entered.
 * This is a UX gate (deterrent), NOT real security (because passcode exists in frontend).
 */
export function GuestGateOverlay() {
  const { unlocked, unlock } = useGuestGate();

  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (unlocked) {
      setPass("");
      setMsg("");
    }
  }, [unlocked]);

  const submit = () => {
    setMsg("");
    const ok = unlock(pass);
    if (!ok) setMsg("Wrong passcode.");
  };

  if (unlocked) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 18,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.12)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 1000, fontSize: 18 }}>Enter Passcode</div>
        <div style={{ marginTop: 8, opacity: 0.85, fontWeight: 800 }}>
          This app requires a shared passcode to open.
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Passcode"
            inputMode="numeric"
            autoFocus
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid #ccc",
              fontSize: 16,
              fontWeight: 900,
              width: "100%",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />

          <button
            type="button"
            onClick={submit}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Unlock
          </button>

          {msg ? <div style={{ color: "crimson", fontWeight: 900 }}>{msg}</div> : null}

          <div style={{ marginTop: 4, opacity: 0.7, fontSize: 12, fontWeight: 800 }}>
            Tip: Set <code>VITE_GUEST_PASSCODE</code> in env for production.
          </div>
        </div>
      </div>
    </div>
  );
}
