"use client";
// Getting files to the teacher: download, or the phone's share sheet (WhatsApp,
// Drive, Bluetooth) when the browser supports sharing files.

export function saveBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function saveText(name: string, text: string, type = "text/plain"): void {
  saveBlob(name, new Blob([text], { type: `${type};charset=utf-8` }));
}

export function canShareFiles(): boolean {
  try {
    const probe = new File(["x"], "x.txt", { type: "text/plain" });
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Share through the phone if possible; otherwise download. Returns how it went. */
export async function shareOrSave(
  name: string,
  text: string,
  type: string,
): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([text], name, { type });
  if (canShareFiles() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  saveText(name, text, type);
  return "saved";
}
