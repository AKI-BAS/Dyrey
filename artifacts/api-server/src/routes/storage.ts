import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

/**
 * POST /storage/uploads/direct
 *
 * Receives the raw file body (Content-Type = image mime type).
 * Uploads it to R2 server-side and returns { objectPath }.
 * No CORS issues — upload goes through our own API.
 */
router.post("/storage/uploads/direct", async (req: Request, res: Response): Promise<void> => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  const validToken = process.env.ADMIN_PASSWORD ?? process.env.OWNER_PASSWORD ?? "";
  if (!token || (token !== process.env.ADMIN_PASSWORD && token !== process.env.OWNER_PASSWORD)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const contentType = req.headers["content-type"] ?? "application/octet-stream";

  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        res.status(400).json({ error: "Empty file" });
        return;
      }
      const objectPath = await storage.uploadBuffer(buffer, contentType);
      // objectPath = /uploads/<uuid>, frontend builds: /api/storage/objects/uploads/<uuid>
      res.json({ objectPath });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });
  req.on("error", () => res.status(500).json({ error: "Upload failed" }));
});

/**
 * GET /storage/objects/*
 * Serves files from R2 proxied through the API.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const file = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    console.error("Serve error:", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

// Legacy presigned URL endpoint — now redirects to direct upload
router.post("/storage/uploads/request-url", async (_req: Request, res: Response): Promise<void> => {
  res.status(410).json({ error: "Use /storage/uploads/direct instead" });
});

export default router;
