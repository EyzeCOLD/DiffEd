import {Request, Response, NextFunction} from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	if (req.session.userId) {
		next();
	} else {
		res.status(401).json({error: "Unauthorized"});
	}
}
