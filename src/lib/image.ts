/** What the photo pickers accept: anything the phone calls an image (incl. iPhone HEIC). */
export const IMAGE_ACCEPT = "image/*,.heic,.heif";
/** Picked files can be big (24-48 MP phone cameras); they are shrunk before upload. */
export const MAX_PICK_BYTES = 50 * 1024 * 1024;
/** What the Storage buckets accept after re-encoding. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function isPickableImage(file: File) {
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

/** Decodes with createImageBitmap, falling back to an <img> (older Safari, some HEIC files). */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("unsupported_image");
    }
  }
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("unsupported_image"))), "image/jpeg", quality)
  );

/**
 * Re-encode photos to JPEG (max `maxSide` px) before upload. Besides saving data,
 * this strips EXIF metadata, including GPS coordinates, and turns HEIC into JPEG.
 * Small GIFs are sent as-is so they keep moving.
 */
export async function prepareImage(file: File, maxSide = 1600) {
  const img = await decode(file);
  const { width, height } = img;
  if (file.type === "image/gif" && file.size <= MAX_UPLOAD_BYTES) {
    img.close();
    return { blob: file as Blob, type: file.type, ext: "gif", width, height };
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img.source, 0, 0, w, h);
  img.close();
  let blob = await toJpeg(canvas, 0.85);
  if (blob.size > MAX_UPLOAD_BYTES) blob = await toJpeg(canvas, 0.6);
  return { blob, type: "image/jpeg", ext: "jpg", width: w, height: h };
}
