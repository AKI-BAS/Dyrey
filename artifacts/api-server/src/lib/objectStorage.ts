import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 env vars not set: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME not set");
  return b;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  /**
   * Upload a buffer directly to R2 (server-side).
   * Returns the internal object path /objects/uploads/<uuid>
   */
  async uploadBuffer(
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const client = getClient();
    const bucket = getBucket();
    const key = `uploads/${randomUUID()}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return `/objects/${key}`;
  }

  /**
   * Kept for backward compat with storage route — returns a fake
   * "upload URL" that points to our own proxy endpoint instead of R2 directly.
   * The real upload now goes through POST /storage/uploads/direct
   */
  async getObjectEntityUploadURL(): Promise<string> {
    // Returning a placeholder — the new direct upload route bypasses this
    return `__direct__`;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    return rawPath; // already normalized when returned from uploadBuffer
  }

  async getObjectEntityFile(objectPath: string): Promise<{ key: string; bucket: string }> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const key = objectPath.slice("/objects/".length);
    if (!key) throw new ObjectNotFoundError();

    const client = getClient();
    const bucket = getBucket();
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new ObjectNotFoundError();
    }
    return { key, bucket };
  }

  async downloadObject(
    file: { key: string; bucket: string },
    cacheTtlSec = 3600
  ): Promise<Response> {
    const client = getClient();
    const result = await client.send(
      new GetObjectCommand({ Bucket: file.bucket, Key: file.key })
    );

    const contentType = result.ContentType ?? "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": `private, max-age=${cacheTtlSec}`,
    };
    if (result.ContentLength) headers["Content-Length"] = String(result.ContentLength);

    if (!result.Body) return new Response(null, { headers });

    const readable = new ReadableStream({
      async start(controller) {
        // @ts-ignore
        for await (const chunk of result.Body) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(readable, { headers });
  }

  // Stubs for interface compat
  async searchPublicObject(_: string): Promise<null> { return null; }
  async trySetObjectEntityAclPolicy(p: string): Promise<string> { return p; }
  async canAccessObjectEntity(_: unknown): Promise<boolean> { return true; }
}
