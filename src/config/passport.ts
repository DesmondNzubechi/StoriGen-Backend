import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../Models/userModel';
import { config } from 'dotenv';

config({ path: './config.env' });   

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  throw new Error('Google OAuth credentials are not properly configured');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
}); 

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists by email
        let user = await User.findOne({ email: profile.emails![0].value });

        if (!user) {
          // Generate a single secure random password for both fields
          const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          
          // Create new user if doesn't exist
          user = await User.create({
            email: profile.emails![0].value,
            fullName: profile.displayName,
            password: randomPassword,
            confirmPassword: randomPassword, // Use the same password
            isEmailVerified: true,
            emailVerified: true,
            googleId: profile.id,
            profilePicture: profile.photos?.[0]?.value || '',
          });
        } else if (!user.googleId) {
          // Link Google account if user exists but hasn't linked Google
          user.googleId = profile.id;
          await user.save();
        } else if (user.googleId !== profile.id) {
          // This should not happen, but handle it gracefully
          return done(new Error('Google account already linked to another user'), undefined);
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  ) 
);

export default passport; 