import passport from "passport";
import {Strategy as GitHubStrategy} from "passport-github2";
import type {GitHubProfile} from "#shared/src/types.js";
import {getUserById, getUserByEmail} from "#/src/queries.js";

declare global {
	namespace Express {
		interface Request {
			user?: User;
		}
	}
}

passport.serializeUser(function (user: Express.User, done) {
	done(null, user.id);
});

passport.deserializeUser(function async(id: number, done) {
	try {
		const user = await getUserById(id);
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
		function async(
			accessToken: string,
			refreshToken: string,
			profile: GitHubProfile,
			done: (error: any, user?: any) => void,
		) {
			try {
				const email = profile.emails?.find((email) => email.primary)?.value;
				if (!email) {
					return done(new Error("No email provided by GitHub"));
				}

				let user = await getUserByEmail(email);
				if (!user) {
					user = await createUser({
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
