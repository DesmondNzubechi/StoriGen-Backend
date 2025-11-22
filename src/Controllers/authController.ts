import User from "../Models/userModel";
import { Response, Request, NextFunction, CookieOptions } from "express";
import catchAsync from "../utils/catchAsync";
import { AppError } from "../errors/appError";
import { config } from "dotenv";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail";
import crypto from "crypto";
import { AppResponse } from "../utils/appResponse";
import { generatEmailVerificationCode } from "../utils/emailVerificationCode";
import { protect as authenticateMiddleware, restrictTo as restrictMiddleware } from "../middleware/authMiddleware";
import { Story } from "../Models/storyModel";
import { Idea } from "../Models/Idea";
import { Summary } from "../Models/Summary";

config({ path: "./config.env" });

const {
  JWT_EXPIRES_IN,
  JWT_SECRET,
  JWT_COOKIE_EXPIRES,
  ORIGIN_URL,
  NODE_ENV,
  COOKIE_DOMAIN,
} = process.env;

if (!JWT_EXPIRES_IN || !JWT_SECRET || !JWT_COOKIE_EXPIRES || !ORIGIN_URL) {
  throw new AppError(
    "Kindly make sure that these env variable are defined",
    400
  );
}

const isProduction = NODE_ENV === "production";
const cookieExpiryDays = parseInt(JWT_COOKIE_EXPIRES, 10);

if (Number.isNaN(cookieExpiryDays)) {
  throw new AppError("JWT_COOKIE_EXPIRES must be a valid number", 500);
}

const buildCookieOptions = (): CookieOptions => {
  const cookieOptions: CookieOptions = {
    expires: new Date(Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  }; 

  if (COOKIE_DOMAIN) {
    cookieOptions.domain = COOKIE_DOMAIN;
  }

  return cookieOptions;
};

const signInToken = async (id: string) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || "10d" } as jwt.SignOptions);
};

interface AuthenticatedRequest extends Request {
  user?: any;
  authToken?: string;
}

export const createAndSendTokenToUser = async (
  user: any,
  statusCode: number,
  message: string,
  res: Response
) => {
  const token = await signInToken(user._id);
  res.cookie("jwt", token, buildCookieOptions());

  res.status(statusCode).json({
    status: "success",
    message,
    data: {
      user,
      token,
    }, 
  });
};
 
//REGISTER USER
export const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, email, password, confirmPassword } = req.body;

    const userExist = await User.findOne({ email: email });

    if (userExist) {
      return next(
        new AppError(
          "User already exist with this email. If you are the one kindly login.",
          700
        )
      );
    }

    if (!fullName || !email || !password || !confirmPassword) {
      return next(new AppError("Kindly fill in the required field", 400));
    }

    const user = await User.create({
      fullName,
      email,
      password,
      confirmPassword,
    });

    res.status(201).json({
      status: "success",
      message:
        "user registration successful.",
    });
  }
); 

//LOGIN USER
export const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(
        new AppError("invalid email or password. Kindly try again", 400)
      );
    } 
 
    // Check if user has Google account linked
    const hasGoogleAccount = user.googleId ? true : false;

    // Only issue JWT if email is verified
    const token = await signInToken(user._id);
    res.cookie("jwt", token, buildCookieOptions());

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          profilePicture: user.profilePicture,
          hasGoogleAccount,
          googleId: user.googleId
        },
        token,
      },
    });
  }
);

//FETCH AUTHENTICATED USER INFORMATION
export const fetchMe = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  res.status(200).json({
    status: "success",
    message: "user fetched successfully",
    data: {
      user,
    },
  });
});

// Shared authentication middleware re-exports
export const protectedRoute = authenticateMiddleware;
export const restrictedRoute = restrictMiddleware;

export const updateMe = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorized to perform this action.", 401));
  }

  const { newEmail, newFullName } = req.body;

  if (!newEmail || !newFullName) {
    return next(new AppError("Kindly provide the required field", 400));
  }

  // Check if email is already taken by another user
  if (newEmail !== user.email) {
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return next(
        new AppError("This email is already taken by another user.", 400)
      );
    }
  }

  // Use _id instead of id, and ensure we're updating the correct user
  const updateUser = await User.findByIdAndUpdate(
    user._id,
    { email: newEmail, fullName: newFullName },
    {
      runValidators: true,
      new: true,
    }
  );

  if (!updateUser) {
    return next(
      new AppError("Could not update user info. Please try again", 400)
    );
  }

  return AppResponse(
    res,
    200,
    "success",
    "User information successfully updated.",
    updateUser
  );
});

export const changeUserPassword = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return next(new AppError("Please provide the required field", 400));
  }

  if (newPassword !== confirmNewPassword) {
    return next(
      new AppError("new password and confirm password must be the same.", 400)
    );
  }
  const user = req.user;

  if (!user) {
    return next(
      new AppError("Could not fetch user with the token. Kindly login again.", 404)
    );
  }

  const correctP = await user.correctPassword(currentPassword, user.password);

  if (!correctP) {
    return next(
      new AppError(
        "The password you provided is not the same with your current password. Please try agian",
        400
      )
    );
  }

  user.password = newPassword;
  user.confirmPassword = confirmNewPassword;
  await user.save();

  createAndSendTokenToUser(user, 200, "password change successful.", res);
});

export const makeUserAdmin = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError("Kindly provide the user id", 400));
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role: "admin" },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!user) {
    return next(new AppError("Something went wrong. Please try again", 400));
  }
  return AppResponse(
    res,
    200,
    "success",
    "User successfully upgraded to admin.",
    user
  );
});

export const forgottPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("User does not exist with this email.", 404));
  }

  const resetToken = user.createResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${ORIGIN_URL}/auth/reset-password/${resetToken}`;

  const message = `forgot your password? kindly reset your password by clicking the link below. If you did not request for this kindly ignore. This is only valid for 30 minutes.`;

  try {
    sendEmail({
      message,
      subject: "RESET PASSWORD LINK",
      email: user.email,
      name: user.fullName,
      link: resetUrl,
      linkName: "Reset Password",
    });

    res.status(200).json({
      status: "success",
      message: "Token sent successful",
    });
  } catch (error) {
    return next(
      new AppError(
        "An error occured while sending email. Please try again",
        400
      )
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const decodedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: decodedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("This token is invalid or already expired", 400));
  }

  const { password, confirmPassword } = req.body;

  user.password = password;
  user.confirmPassword = confirmPassword;
  user.passwordResetTokenExpires = undefined;
  user.passwordResetToken = undefined;

  await user.save();

  sendEmail({
    message:
      "You have successfully reset your password. Kindly login back using the link below",
    subject: "PASSWORD RESET SUCCESSFUL",
    email: user.email,
    name: user.fullName,
    link: ORIGIN_URL,
    linkName: "Login",
  });

  return AppResponse(
    res,
    200,
    "success",
    "You have successfully reset your password. Kindly Login again",
    null
  );
});

export const sendVerificationCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("User does not exist", 404));
  }

  if (user.emailVerified) {
    return next(new AppError("User email already verified. Kindly login", 400));
  }

  const verificationCode = await generatEmailVerificationCode();
  const verificationMessage =
    "Please verify your email using the code below to start booking your favorite events. Note, the code expires in 30 minutes.";

  user.emailVerificationCode = verificationCode;
  user.emailVerificationCodeExpires = Date.now() + 30 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  sendEmail({
    name: user.fullName,
    email: user.email,
    subject: "VERIFY YOUR EMAIL",
    message: verificationMessage,
    vCode: verificationCode,
    link: ORIGIN_URL,
    linkName: "Visit our website",
  });

  return AppResponse(
    res,
    200,
    "success",
    "Verification code sent successful. Kindly check your email",
    null
  );
});

export const verifyUserEmail = catchAsync(async (req, res, next) => {
  const { verificationCode } = req.body;

  if (!verificationCode) {
    return next(
      new AppError(
        "Kindly provide the verification code sent to your email.",
        400
      )
    );
  }

  const user = await User.findOne({ emailVerificationCode: verificationCode });

  if (!user) {
    return next(
      new AppError(
        "Wrong verification code or if you did not get any code try resending it.",
        400
      )
    );
  }

  if (user.emailVerified) {
    return next(
      new AppError("User Email already verified. Kindly proceed to login.", 400)
    );
  }

  if (user.emailVerificationCodeExpires < Date.now()) {
    return next(
      new AppError("Verification code expired. Kindly send another one.", 400)
    );
  }

  user.emailVerificationCode = null;
  user.emailVerificationCodeExpires = null;
  user.emailVerified = true;
  user.isEmailVerified = true;

  await user.save({ validateBeforeSave: false });

  const verificationMessage =
    "You have successfully verified your email. You can now proceed to login";

  sendEmail({
    name: user.fullName,
    email: user.email,
    subject: "EMAIL VERIFICATION SUCCESSFUL",
    message: verificationMessage,
    vCode: "VERIFIED",
    // link: `${ORIGIN_URL}/login`,
    // linkName: "Login Here",
  });

  return AppResponse(
    res,
    200,
    "success",
    "You have successfully verified your email. Kindly Login again",
    null
  );
});

export const logoutUser = catchAsync(async (req, res, next) => {
  const cookieOptions = {
    ...buildCookieOptions(),
    expires: new Date(Date.now() + 1000),
  };

  res.cookie("jwt", "logout", cookieOptions);

  res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

export const googleOAuthSuccess = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;

  if (!user) {
    return next(new AppError('Authentication failed', 401));
  }
 
  // Check if this is a new user or existing user
  const isNewUser = !user.createdAt || (Date.now() - new Date(user.createdAt).getTime()) < 60000; // Within 1 minute

  const token = await signInToken(user._id);
  res.cookie("jwt", token, buildCookieOptions());
 
  // Return success response - frontend will handle redirection
  res.status(200).json({
    status: "success",
    message: isNewUser ? "Google authentication successful. Account created." : "Google authentication successful",
    data: {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profilePicture: user.profilePicture,
        hasGoogleAccount: !!user.googleId,
        googleId: user.googleId
      },
      token,
      isNewUser
    }
  });
});

//GOOGLE OAUTH FAILURE HANDLER
export const googleOAuthFailure = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  return next(new AppError('Google authentication failed', 401));
});

//LINK GOOGLE ACCOUNT TO EXISTING EMAIL ACCOUNT
export const linkGoogleAccount = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Verify user credentials first
  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      new AppError("Invalid email or password. Please verify your credentials.", 400)
    );
  }

  // Check if user already has Google account linked
  if (user.googleId) {
    return next(
      new AppError("This account is already linked to a Google account.", 400)
    );
  }

  // Return success with instructions to proceed with Google OAuth
  res.status(200).json({
    status: "success",
    message: "Account verified. Please proceed with Google OAuth to link your account.",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName
      }
    }
  });
});

//UNLINK GOOGLE ACCOUNT
export const unlinkGoogleAccount = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { user } = req;

  if (!user) {
    return next(
      new AppError("Could not find user with this token. Please login again.", 404)
    );
  }

  // Check if user has Google account linked
  if (!user.googleId) {
    return next(
      new AppError("No Google account is linked to this account.", 400)
    );
  }

  // Check if user has a password set (to ensure they can still login)
  if (!user.password) {
    return next(
      new AppError("Cannot unlink Google account. Please set a password first.", 400)
    );
  }

  // Unlink Google account
  user.googleId = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Google account successfully unlinked.",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        hasGoogleAccount: false
      }
    }
  });
});

// ========== ADMIN CONTROLLERS ==========

// Get all users (Admin only)
export const getAllUsers = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const users = await User.find().select("-password -passwordResetToken -passwordResetTokenExpires -emailVerificationToken -emailVerificationExpires -emailVerificationCode -emailVerificationCodeExpires");

  return AppResponse(
    res,
    200,
    "success",
    "Users fetched successfully",
    { users, count: users.length }
  );
});

// Add a new user (Admin only)
export const addUser = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { fullName, email, password, confirmPassword, role } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return next(new AppError("Kindly fill in all required fields", 400));
  }

  if (password !== confirmPassword) {
    return next(new AppError("Password and confirm password must be the same", 400));
  }

  const userExist = await User.findOne({ email: email });

  if (userExist) {
    return next(
      new AppError(
        "User already exists with this email.",
        700
      )
    );
  }

  const userRole = role && ["admin", "user", "super-admin"].includes(role) ? role : "user";

  const user = await User.create({
    fullName,
    email,
    password,
    confirmPassword,
    role: userRole,
    emailVerified: true, // Admin-created users are auto-verified
  });

  const userResponse = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };

  return AppResponse(
    res,
    201,
    "success",
    "User created successfully",
    userResponse
  );
});

// Get total number of stories created by a user (Admin only)
export const getUserStoryCount = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError("Kindly provide the user id", 400));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const storyCount = await Story.countDocuments({ user: id });

  return AppResponse(
    res,
    200,
    "success",
    "Story count fetched successfully",
    {
      userId: id,
      userEmail: user.email,
      userFullName: user.fullName,
      storyCount
    }
  );
});

// Get total number of ideas created by a user (Admin only)
export const getUserIdeaCount = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError("Kindly provide the user id", 400));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const ideaCount = await Idea.countDocuments({ user: id });

  return AppResponse(
    res,
    200,
    "success",
    "Idea count fetched successfully",
    {
      userId: id,
      userEmail: user.email,
      userFullName: user.fullName,
      ideaCount
    }
  );
});

// Get total number of summaries created by a user (Admin only)
export const getUserSummaryCount = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError("Kindly provide the user id", 400));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const summaryCount = await Summary.countDocuments({ user: id });

  return AppResponse(
    res,
    200,
    "success",
    "Summary count fetched successfully",
    {
      userId: id,
      userEmail: user.email,
      userFullName: user.fullName,
      summaryCount
    }
  );
});
