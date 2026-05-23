import {openDB} from "idb";
import nacl from "tweetnacl";
import { encodeBase64 } from "tweetnacl-util";

export const generateKeyPair = async () => {
    const keyPair = nacl.box.keyPair();
    return {    
        publicKey: encodeBase64(keyPair.publicKey),
        secretKey: encodeBase64(keyPair.secretKey)
    };
};



export const encryptPrivateKey = async (privateKey, password) => {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        derivedKey,
        encoder.encode(privateKey)
    );
    return {
        encryptedData: new Uint8Array(encrypted),
        salt: salt,
        iv: iv,
    };
}

export const saveEncryptedPrivateKey = async (encrypedPrivateKeyData) => {
    const db = await openDB("e2ee", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("keys")) {
                db.createObjectStore("keys", { keyPath: "id" });
            }
        }
    });
    await db.put("keys", { id: "privateKey", ...encrypedPrivateKeyData });
}