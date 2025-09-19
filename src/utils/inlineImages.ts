// utils/inlineImages.ts
import cloudinary from "../utils/cloudinary";
import { Buffer } from "buffer";

const DATA_IMG_RE =
  /<img\b[^>]*\bsrc=["'](data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+))["'][^>]*>/gi;

/**
 * Upload a Buffer to Cloudinary and return secure_url
 */
function uploadBufferToCloudinary(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "newsletter", // optional: keep things organized
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || "");
      }
    );
    stream.end(buf);
  });
}

/**
 * Scan HTML for <img src="data:...">, upload them to Cloudinary, and rewrite src to https URLs.
 */
export async function replaceInlineImagesWithCloudinary(
  html: string
): Promise<string> {
  if (!html) return html;

  const matches = [...html.matchAll(DATA_IMG_RE)];
  if (matches.length === 0) return html;

  // Upload all images
  const uploads = await Promise.all(
    matches.map(async (m) => {
      const base64Payload = m[2]; // group2 is the raw base64 per regex
      const buf = Buffer.from(base64Payload, "base64");
      const url = await uploadBufferToCloudinary(buf);
      return { fullTag: m[0], url };
    })
  );

  // Rewrite HTML
  let out = html;
  for (const { fullTag, url } of uploads) {
    if (!url) continue;
    const newTag = fullTag.replace(
      /src=["'][^"']+["']/,
      `src="${url}" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;"`
    );

    out = out.replace(fullTag, newTag);
  }
  return out;
}

/** (Optional) create a plain-text fallback from HTML for the `text` field in emails */
export function htmlToTextFallback(html: string): string {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}
