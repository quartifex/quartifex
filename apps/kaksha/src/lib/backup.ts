// Encrypted backups: the only way data leaves the phone in v1, and only when the
// teacher saves or shares the file themselves.
//
// File = JSON envelope { format, version, kdf, cipher, data }.
// Key  = PBKDF2-SHA-256 over the passphrase, 600,000 iterations, 16-byte random salt.
// Data = AES-GCM (256-bit key, 12-byte random IV) over the gzip of the backup JSON.
// A wrong passphrase fails the GCM tag check, so it can never "restore" garbage.

import type { Answer, Assessment, ClassGroup, School, Sitting, Student } from "./model";

export interface BackupTables {
  schools: School[];
  classes: ClassGroup[];
  students: Student[];
  assessments: Assessment[];
  responses: Answer[];
  sittings: Sitting[];
}

export interface BackupPayload {
  format: "kaksha-data";
  version: 1;
  exportedAt: string;
  tables: BackupTables;
}

export interface BackupEnvelope {
  format: "kaksha-backup";
  version: 1;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  data: string;
}

export const KDF_ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 8;

export class BackupError extends Error {
  constructor(
    readonly code:
      | "not-a-backup"
      | "newer-version"
      | "wrong-passphrase"
      | "damaged"
      | "short-passphrase",
  ) {
    super(code);
    this.name = "BackupError";
  }
}

const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
};
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase.normalize("NFC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(
  tables: BackupTables,
  passphrase: string,
  iterations = KDF_ITERATIONS,
): Promise<BackupEnvelope> {
  if (passphrase.length < MIN_PASSPHRASE) throw new BackupError("short-passphrase");
  const payload: BackupPayload = {
    format: "kaksha-data",
    version: 1,
    exportedAt: new Date().toISOString(),
    tables,
  };
  const plain = await pipe(
    new TextEncoder().encode(JSON.stringify(payload)),
    new CompressionStream("gzip"),
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      plain as BufferSource,
    ),
  );
  return {
    format: "kaksha-backup",
    version: 1,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt: b64(salt) },
    cipher: { name: "AES-GCM", iv: b64(iv) },
    data: b64(sealed),
  };
}

function isEnvelope(value: unknown): value is BackupEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.format === "kaksha-backup" && typeof v.data === "string";
}

/** Read a backup file's text. Throws BackupError with a code the UI can explain. */
export async function decryptBackup(text: string, passphrase: string): Promise<BackupPayload> {
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new BackupError("not-a-backup");
  }
  if (!isEnvelope(envelope)) throw new BackupError("not-a-backup");
  if (envelope.version !== 1) throw new BackupError("newer-version");
  let key: CryptoKey;
  let sealed: Uint8Array;
  let iv: Uint8Array;
  try {
    key = await deriveKey(passphrase, unb64(envelope.kdf.salt), envelope.kdf.iterations);
    sealed = unb64(envelope.data);
    iv = unb64(envelope.cipher.iv);
  } catch {
    throw new BackupError("damaged");
  }
  let plain: Uint8Array;
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        sealed as BufferSource,
      ),
    );
  } catch {
    throw new BackupError("wrong-passphrase");
  }
  try {
    const json = new TextDecoder().decode(await pipe(plain, new DecompressionStream("gzip")));
    const payload = JSON.parse(json) as BackupPayload;
    if (payload.format !== "kaksha-data" || !payload.tables) throw new Error("shape");
    return payload;
  } catch {
    throw new BackupError("damaged");
  }
}

/**
 * Backups end in ".kaksha.txt": phones only let web apps share a short list of file
 * types (WhatsApp included), and plain text is on it. The content is still encrypted.
 */
export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `kaksha-backup-${d}.kaksha.txt`;
}
