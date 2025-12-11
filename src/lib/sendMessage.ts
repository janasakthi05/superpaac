// src/lib/sendMessage.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function sendGroupMessage(text: string, anonId: number | string, isAdmin = false) {
  return addDoc(collection(db, "groupChatMessages"), {
    text,
    anonId,
    isAdmin,
    timestamp: serverTimestamp(),
  });
}

export async function sendPrivateMessage(text: string, anonId: number | string, isAdmin = false) {
  return addDoc(collection(db, "privateMessages"), {
    text,
    anonId,
    isAdmin,
    timestamp: serverTimestamp(),
  });
}
