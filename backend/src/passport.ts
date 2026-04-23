import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import {User, GoogleProfile} from "#shared/src/types.js";
import {getUserById, getUserByEmail, createUser} from "./queries.js";

passport.serializeUser((user: unknown, done: (err: Error | null, id?: number) => void) => {
	const typedUser = user as User;
	done(null, typedUser.id);
});

passport.deserializeUser(async (id: number, done) => {
	try {
		const user = await getUserById(id);
		done(null, user || false);
	} catch (err) {
		done(err instanceof Error ? err : new Error("Deserialization error"));
	}
});

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			callbackURL: "http://localhost:8080/auth/google/callback",
			scope: ["profile", "email"],
		},
		async function (
			accessToken: string,
			refreshToken: string,
			profile: GoogleProfile,
			done: (error: any, user?: User | false) => void,
		) {
			try {
				const email = profile.emails?.[0].value;
				if (!email) {
					return done(new Error("No email provided by Google"));
				}

				let user = await getUserByEmail(email);

				if (!user) {
					user = await createUser({
						username: profile.displayName || `user_${profile.id}`,
						email: email,
						password: null,
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
