/**
 * Re-encode photos to JPEG (max `maxSide` px) before upload. Besides saving data,
 * this strips EXIF metadata, including GPS coordinates. GIFs are sent as-is.
 */
export async function prepareImage(file: File, maxSide = 1600) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (file.type === "image/gif") {
    bitmap.close();
    return { blob: file as Blob, type: file.type, ext: "gif", width, height };
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85)
  );
  return { blob, type: "image/jpeg", ext: "jpg", width: w, height: h };
}
