import mongoose, { Schema, models, Document } from "mongoose";
import validator from "validator";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
 
// 1️⃣ Define the IUser interface
export interface IUser extends Document {
  fullName: string;
  email: string;
  role: "admin" | "user" | "super-admin";
  password: string;
  confirmPassword?: string;
  googleId?: string;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  passwordChangeAt?: Date;
  profileImage?: string | null;
  emailVerified?: boolean;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
  active?: boolean;
  correctPassword(
    userPassword: string,
    originalPassword: string
  ): Promise<boolean>;
  changePasswordAfter(JWTTimestamp: string | number): boolean;
  createResetPasswordToken(): string;
}

// 2️⃣ Define the schema
const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, "Please provide your fullname"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email address"],
      unique: true,
      validate: [validator.isEmail, "Kindly provide a valid email"],
    },
    role: {  
      type: String,
      required: true,
      enum: ["admin", "user", "super-admin"],
      default: "user",
    },
    password: {
      type: String,
      required: [true, "Kindly provide your password"],
    },
    confirmPassword: {
      type: String,
      required: [
        function (this: IUser) {
          return !!this.password && !this.googleId;
        },
        "Kindly confirm your password",
      ],
      validate: {
        validator: function (this: IUser, confirmP: string) {
          return confirmP === this.password;
        },
        message: "Password and confirm password must be the same.",
      },
    },
    googleId: String,
    profileImage: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    active: { type: Boolean, default: true, select: false },
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
    passwordChangeAt: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
  },
  {
    timestamps: true,
  }
);

// 3️⃣ Pre-save hook to hash password
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcryptjs.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

// 4️⃣ Method to check password
userSchema.methods.correctPassword = async function (
  this: IUser,
  userPassword: string,
  originalPassword: string
) {
  return bcryptjs.compare(userPassword, originalPassword);
};

// 5️⃣ Check if password changed after JWT issued
userSchema.methods.changePasswordAfter = function (
  this: IUser,
  JWTTimestamp: string | number
): boolean {
  if (this.passwordChangeAt) {
    const jwtTimestamp =
      typeof JWTTimestamp === "string"
        ? parseInt(JWTTimestamp, 10)
        : JWTTimestamp;
    const changeTimestamp = this.passwordChangeAt.getTime() / 1000;
    return jwtTimestamp < changeTimestamp;
  }
  return false;
};

// 6️⃣ Generate password reset token
userSchema.methods.createResetPasswordToken = function (this: IUser) {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);

  return resetToken;
};

// 7️⃣ Export the model
const User = models.users || mongoose.model<IUser>("users", userSchema);

export default User;
