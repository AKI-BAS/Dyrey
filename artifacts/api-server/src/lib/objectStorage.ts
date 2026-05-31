import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// ── R2 client (S3-compatible) ─────────────────────────────────────────────────
function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not set.");
  return bucket;
}

// ── Errors ────────────────────────────────────────────────────────────────────
export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ── ACL shim (no-op — kept for interface compatibility) ───────────────────────
export type ObjectAclPolicy = { visibility: "public" | "private" };
export enum ObjectPermission { READ = "read", WRITE = "write" }

// ── Service ───────────────────────────────────────────────────────────────────
export class ObjectStorageService {
  /**
   * Generate a presigned PUT URL the client can upload to directly.
   * Returns the signed URL and the R2 object key (used later to serve the file).
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const client = getR2Client();
    const bucket = getBucket();
    const key = `uploads/${randomUUID()}`;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    // Embed the key in the signed URL's hash so normalizeObjectEntityPath can recover it.
    // We return a fake "path" URL that our normalizer understands.
    // Actually: return the real signed URL — normalizer strips it back to /objects/<key>
    return signedUrl;
  }

  /**
   * Convert a raw R2 presigned PUT URL → internal object path /objects/<key>
   * R2 signed URL format: https://<account>.r2.cloudflarestorage.com/<key>?X-Amz-...
   * The path IS the key — no bucket prefix in the path.
   */
  normalizeObjectEntityPath(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      // pathname = /<key> e.g. /uploads/uuid
      const key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
      return `/objects/${key}`;
    } catch {
      return rawUrl;
    }
  }

  /**
   * Verify the object exists in R2 and return a descriptor for downloading.
   */
  async getObjectEntityFile(objectPath: string): Promise<{ key: string; bucket: string }> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    const key = objectPath.slice("/objects/".length);
    if (!key) throw new ObjectNotFoundError();

    const client = getR2Client();
    const bucket = getBucket();

    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new ObjectNotFoundError();
    }

    return { key, bucket };
  }

  /**
   * Stream an object from R2 back to the client.
   */
  async downloadObject(
    file: { key: string; bucket: string },
    _cacheTtlSec = 3600
  ): Promise<Response> {
    const client = getR2Client();
    const result = await client.send(
      new GetObjectCommand({ Bucket: file.bucket, Key: file.key })
    );

    const contentType = result.ContentType ?? "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": `private, max-age=${_cacheTtlSec}`,
    };
    if (result.ContentLength) {
      headers["Content-Length"] = String(result.ContentLength);
    }

    // result.Body is a SdkStream — convert to Web ReadableStream
    const body = result.Body;
    if (!body) return new Response(null, { headers });

    // @aws-sdk returns an async iterable; wrap it as a ReadableStream
    const readable = new ReadableStream({
      async start(controller) {
        // @ts-ignore — Body is SdkStreamMixin which is async iterable
        for await (const chunk of body) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(readable, { headers });
  }

  // ── Stubs kept for interface compatibility with storage.ts ──────────────────

  async searchPublicObject(_filePath: string): Promise<null> {
    return null; // Public objects not used — all served via /storage/objects/*
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _policy: ObjectAclPolicy): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(_opts: {
    userId?: string;
    objectFile: { key: string; bucket: string };
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return true; // Auth handled at the route level
  }
}
