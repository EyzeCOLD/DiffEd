import { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "#shared/src/types.js";

export function requireAuth(req: Request, res: Response<ApiResponse<null>>, next: NextFunction) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ ok: false, error: "Unauthorized" });
    }
}
