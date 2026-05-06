import passport from "passport";
import {Strategy as GitHubStrategy, Profile} from "passport-github2";
import type {VerifyCallback} from "passport-oauth2";
import {GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET} from "#/src/env.js";

passport.use(
	new GitHubStrategy(
		{
			clientID: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET,
			callbackURL: "/api/auth/github/callback",
		},
		function verify(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
			done(null, profile);
		},
	),
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));
