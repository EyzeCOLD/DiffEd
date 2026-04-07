import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min (how long to remember requests for)
    limit: 500, // TODO! limit each IP to 5 login requests per windowMs, 500 for developing purposes
    message: "Too many login attempts, please try again later."
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
}

export default { requireAuth, limiter };
