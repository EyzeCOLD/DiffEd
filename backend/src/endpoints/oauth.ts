import type {Express, Request, Response} from "express";
import crypto from "node:crypto";
import passport from "passport";
import {SESSION_SECRET} from "#/src/env.js";
import {timestampedLog} from "#/src/logging.js";
import {isDbError, isUniqueViolation} from "#/src/utils.js";
import {usernameSchema} from "#/src/validation/schemas.js";
import type {ApiResponse, User, PendingGithubPayload} from "#shared/src/types.js";
import {requireAuth} from "#/src/middleware.js";
import userQueryService from "#/src/queries/users.js";

function signToken(payload: PendingGithubPayload): string {
	const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const signature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
	return `${data}.${signature}`;
}

function verifyToken(token: string): PendingGithubPayload | null {
	const dotIndex = token.lastIndexOf(".");
	if (dotIndex === -1) return null;

	const data = token.slice(0, dotIndex);
	const signature = token.slice(dotIndex + 1);
	const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");

	if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

	const payload: PendingGithubPayload = JSON.parse(Buffer.from(data, "base64url").toString());
	if (Date.now() > payload.expiration) return null;

	return payload;
}

function githubAuthStart(app: Express) {
	app.get("/api/auth/github", (req: Request, res: Response, next) => {
		const action = (req.query.action as string) || "login";
		const githubAuth = passport.authenticate("github", {
			scope: ["user:email"],
			session: false,
			callbackURL: `/api/auth/github/callback?action=${action}`,
		} satisfies passport.AuthenticateOptions & {callbackURL: string} as passport.AuthenticateOptions);
		githubAuth(req, res, next);
	});
}

function githubAuthMiddleware(req: Request, res: Response, next: (err?: unknown) => void) {
	const action = (req.query.action as string) || "login";
	const githubAuth = passport.authenticate("github", {
		session: false,
		failureRedirect: "/login",
		callbackURL: `/api/auth/github/callback?action=${action}`,
	} satisfies passport.AuthenticateOptions & {callbackURL: string} as passport.AuthenticateOptions);
	githubAuth(req, res, next);
}

function githubAuthCallback(app: Express) {
	app.get("/api/auth/github/callback", githubAuthMiddleware, async (req: Request, res: Response) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const profile = req.user as passport.Profile & {emails?: {value: string}[]};
		const githubId = profile.id;
		const primaryEmail = profile.emails?.[0]?.value ?? null;
		const displayName = profile.username ?? profile.displayName ?? "user";

		try {
			const action = req.query.action as string;

			if (action === "link_account") {
				const userId = req.session.userId;
				if (!userId) return res.redirect("/login");
				const existingByGithubId = await userQueryService.getUserByGithubId(githubId);
				if (existingByGithubId && existingByGithubId.id !== userId)
					return res.redirect("/account?github_error=already_linked");
				await userQueryService.linkGithubId(userId, githubId);
				return res.redirect("/account");
			}

			const existingByGithubId = await userQueryService.getUserByGithubId(githubId);

			if (action === "login") {
				if (!existingByGithubId) return res.redirect("/login?github_error=no_account");
				return establishSession(req, res, existingByGithubId.id);
			}

			// signup: reject if this GitHub account or its email is already registered
			if (existingByGithubId)
				return res.redirect(`/login?github_exists=${encodeURIComponent(existingByGithubId.email)}`);
			if (primaryEmail) {
				const existingByEmail = await userQueryService.getUserByEmail(primaryEmail);
				if (existingByEmail) return res.redirect(`/login?github_error=email_exists`);
			}

			const token = signToken({
				githubId,
				email: primaryEmail ?? "",
				displayName,
				expiration: Date.now() + 10 * 60 * 1000,
			});
			res.redirect(`/signup?github_token=${token}`);
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			res.redirect("/login");
		}
	});
}

function setGithubUsername(app: Express) {
	app.post("/api/auth/github/username", async (req: Request, res: Response<ApiResponse<User>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);

		const {token, username} = req.body;
		if (!token || !username) {
			return res.status(400).json({ok: false, error: "Missing token or username"});
		}

		const payload = verifyToken(token);
		if (!payload) {
			return res.status(400).json({ok: false, error: "Invalid or expired token"});
		}

		const parsed = usernameSchema.safeParse(username);
		if (!parsed.success) {
			return res.status(400).json({ok: false, error: parsed.error.issues[0].message});
		}

		try {
			const id = await userQueryService.createOAuthUser(parsed.data, payload.email, payload.githubId);
			const user = await userQueryService.getUserById(id);
			if (!user) throw new Error("User not found after creation");

			req.session.regenerate((error) => {
				if (error) return res.status(500).json({ok: false, error: "Session error"});
				req.session.userId = id;
				req.session.save((error) => {
					if (error) return res.status(500).json({ok: false, error: "Session save failed"});
					res.status(201).json({ok: true, data: user});
				});
			});
		} catch (error: unknown) {
			if (isDbError(error) && isUniqueViolation(error)) {
				return res.status(409).json({ok: false, error: "Username or email already in use"});
			}
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function githubUnlink(app: Express) {
	app.delete("/api/auth/github/link", requireAuth, async (req: Request, res: Response<ApiResponse<null>>) => {
		timestampedLog(`REQUEST >>> ${req.method} ${req.url}`);
		const id = req.session.userId!;
		try {
			const password = await userQueryService.getHashedPasswordById(id);
			if (!password) {
				return res.status(400).json({ok: false, error: "Cannot unlink GitHub: no password set"});
			}
			await userQueryService.unlinkGithubId(id);
			res.status(200).json({ok: true, data: null});
		} catch (error: unknown) {
			if (isDbError(error)) {
				timestampedLog(`ERROR <<< ${error.code}: ${error.detail}`);
			} else {
				timestampedLog(`ERROR <<< ${error}`);
			}
			return res.status(500).json({ok: false, error: "Internal server error"});
		}
	});
}

function establishSession(req: Request, res: Response, userId: number) {
	req.session.regenerate((error) => {
		if (error) return res.redirect("/login");
		req.session.userId = userId;
		req.session.save((error) => {
			if (error) return res.redirect("/login");
			res.redirect("/dashboard");
		});
	});
}

export default {githubAuthStart, githubAuthCallback, setGithubUsername, githubUnlink};
