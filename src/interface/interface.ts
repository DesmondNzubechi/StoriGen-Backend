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