import { Router, type IRouter } from "express";
import { AdminLoginBody, AdminLoginResponse, GetAdminMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "staff1234";

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
  res.json(AdminLoginResponse.parse({ success: true, token }));
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const decoded = Buffer.from(auth.replace("Bearer ", ""), "base64").toString("utf-8");
    if (decoded.startsWith("admin:")) {
      res.json(GetAdminMeResponse.parse({ authenticated: true }));
      return;
    }
  } catch {
    // fall through
  }

  res.status(401).json({ error: "Not authenticated" });
});

export default router;
