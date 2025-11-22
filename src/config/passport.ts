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
  // Use _id instead of id to ensure consistency with Mongoose
  done(null, user._id ? user._id.toString() : user.id);
}); 

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(new Error('User not found'), null);
    }
    done(null, user);
  } catch (error) {
    done(error as Error, null);
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
        // Validate profile data
        if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
          return done(new Error('Email not provided by Google'), undefined);
        }

        const email = profile.emails[0].value;
        
        // Check if user already exists by email
        let user = await User.findOne({ email });

        if (!user) {
          // Generate a single secure random password for both fields
          const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          
          // Create new user if doesn't exist
          try {
            user = await User.create({
              email: email,
              fullName: profile.displayName || 'User',
              password: randomPassword,
              confirmPassword: randomPassword, // Use the same password
              isEmailVerified: true,
              emailVerified: true,
              googleId: profile.id,
              profilePicture: profile.photos?.[0]?.value || '',
            });
          } catch (createError: any) {
            console.error('Error creating user:', createError);
            return done(new Error(`Failed to create user: ${createError.message || 'Unknown error'}`), undefined);
          }
        } else if (!user.googleId) {
          // Link Google account if user exists but hasn't linked Google
          user.googleId = profile.id;
          try {
            await user.save();
          } catch (saveError: any) {
            console.error('Error saving user:', saveError);
            return done(new Error(`Failed to link Google account: ${saveError.message || 'Unknown error'}`), undefined);
          }
        } else if (user.googleId !== profile.id) {
          // This should not happen, but handle it gracefully
          return done(new Error('Google account already linked to another user'), undefined);
        }

        return done(null, user);
      } catch (error: any) {
        console.error('Passport Google Strategy Error:', error);
        return done(new Error(error.message || 'Authentication failed'), undefined);
      }
    }
  ) 
);

export default passport; 