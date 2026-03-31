"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(auth));
  const [inviteStatus, setInviteStatus] = useState("none"); // none | unknown | allowed | denied
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      setInviteError("");
      if (nextUser?.email) setInviteStatus("unknown");
      else setInviteStatus("none");
    });
  }, []);

  useEffect(() => {
    if (!db) return;
    if (!user?.email) return;

    const emailKey = String(user.email).trim().toLowerCase();
    if (!emailKey) return;

    return onSnapshot(
      doc(db, "allowedUsers", emailKey),
      (snap) => {
        setInviteStatus(snap.exists() ? "allowed" : "denied");
      },
      (err) => {
        setInviteError(err?.message ?? "Invite check failed");
        setInviteStatus("denied");
      }
    );
  }, [user?.email]);

  const checkingInvite = Boolean(user && inviteStatus === "unknown");

  return { user, loading, inviteStatus, inviteError, checkingInvite };
}
