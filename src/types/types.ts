import mongoose, { Date, ObjectId } from "mongoose";
import { Request } from 'express';
import { IUser } from '../Models/userModel';

export interface userType {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string | undefined;
  role: 'user' | 'admin' | 'super-admin';
  profileImage?: string;
  id: mongoose.ObjectId;
  emailVerified: boolean;
  active: boolean;
  emailVerificationCode?: number | null;
  emailVerificationCodeExpires?: Date | unknown | any;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  googleId?: string;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordChangeAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  correctPassword(
    userPassword: string,
    originalPassword: string
  ): Promise<boolean>;
  changePasswordAfter(JWTTimestamp: string): boolean;
  createResetPasswordToken(): string;
}

export interface productType {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  ratings: {
    rating: number;
    numReviews: number;
  };
  reviews: {
    user: mongoose.ObjectId;
    name: string;
    rating: number;
    comment: string;
    createdAt: Date;
  }[];
  featured: boolean;
  discount: number;
  brand: string;
  specifications: {
    [key: string]: string | number | boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'out-of-stock';
  id: mongoose.ObjectId;
}

export interface AuthenticatedRequest extends Request {
  user: IUser;
}