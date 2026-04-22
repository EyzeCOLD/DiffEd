import passport from "passport";
import {Strategy as GitHubStrategy} from "passport-github2";
import type {GitHubProfile, User} from "#shared/src/types.js";
import {getUserById, getUserByEmail, createOAuthUser} from "#/src/queries.js";

passport.serializeUser(function (user: Express.User, done) {
	done(null, (user as User).id);
});

passport.deserializeUser(function async(id: number, done) {
	try {
		const user = getUserById(id);
		done(null, user || false);
	} catch (err) {
		done(err);
	}
});

passport.use(
	new GitHubStrategy(
		{
			clientID: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
			callbackURL: "http://127.0.0.1:8080/auth/github/callback",
			scope: ["user:email"],
		},
		async (
			accessToken: string,
			refreshToken: string,
			profile: GitHubProfile,
			done: (error: any, user?: any) => void,
		) => {
			try {
				const email = profile.emails?.find((email) => email.primary)?.value;
				if (!email) {
					return done(new Error("No email provided by GitHub"));
				}

				let user = await getUserByEmail(email);
				if (!user) {
					user = await createOAuthUser({
						username: profile.username,
						email: email,
					});
				}
				return done(null, user);
			} catch (err) {
				return done(err);
			}
		},
	),
);

export default passport;
