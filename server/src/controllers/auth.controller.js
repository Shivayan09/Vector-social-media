import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/user.validator.js";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { generateToken, getCookieOptions } from "../utils/generateToken.js";

const sendResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        auth: {
            user: process.env.EMAIL_USER || process.env.EMAIL,
            pass: process.env.EMAIL_PASS,
        },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
        from: `"Vector" <${process.env.EMAIL_USER || process.env.EMAIL}>`,
        to: email,
        subject: 'Password Reset Request — Vector',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>You requested a password reset for your Vector account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="${resetLink}" 
                   style="background: #7c3aed; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset Password
                </a>
                <p style="color: #666; margin-top: 16px;">
                    This link expires in <strong>15 minutes</strong>.
                </p>
                <p style="color: #666;">
                    If you did not request this, please ignore this email.
                </p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

const getValidationMessage = (validationResult, fallbackMessage) => {
    const firstIssue = validationResult?.error?.issues?.[0];
    return firstIssue?.message || fallbackMessage;
};

export const register = async (req, res) => {
    try {
        if (typeof req.body?.name !== "string" || !req.body.name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter your name!",
            });
        }

        const validation = registerSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: getValidationMessage(validation, "Invalid registration data"),
            });
        }

        const {
            name,
            surname,
            phoneNumber,
            email,
            password,
            username,
            bio,
            description,
            isPrivate,
        } = validation.data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists!",
            });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: "Username already taken!",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            surname,
            phoneNumber,
            email,
            password: hashedPassword,
            username,
            bio,
            description,
            isPrivate: isPrivate === true,
            isProfileComplete: true,
        });

        const token = generateToken(user._id, user.tokenVersion || 0);

        res.cookie("token", token, getCookieOptions());

        return res.status(200).json({
            success: true,
            message: "Account created successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }
        const user = req.user;

        const followings = await Follow.find({ follower: user._id, status: "accepted" }).select("following").lean();
        const followers = await Follow.find({ following: user._id, status: "accepted" }).select("follower").lean();
        const followRequests = await Follow.find({ following: user._id, status: "pending" }).select("follower").lean();

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                surname: user.surname,
                email: user.email,
                username: user.username,
                bio: user.bio,
                description: user.description,
                avatar: user.avatar,
                isProfileComplete: user.isProfileComplete,
                signupStep: user.signupStep,
                followers: followers.map(f => f.follower.toString()),
                following: followings.map(f => f.following.toString()),
                isPrivate: user.isPrivate,
                followRequests: followRequests.map(f => f.follower.toString()),
                blockedUsers: (user.blockedUsers || []).map(id => id.toString()),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const login = async (req, res) => {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: getValidationMessage(validation, "Invalid login data"),
        });
    }

    const { username, password } = validation.data;

    try {
        const user = await User.findOne({ username }).select("+password");
        const matched = user && await bcrypt.compare(password, user.password);
        if (!user || !matched) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            })
        }
        const token = generateToken(user._id, user.tokenVersion || 0);
        res.cookie("token", token, getCookieOptions());
        return res.status(200).json({
            success: true,
            message: "Logged In successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', getCookieOptions());
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const validation = forgotPasswordSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: getValidationMessage(validation, "Invalid email"),
            });
        }

        const { email } = validation.data;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ 
                success: true, 
                message: "Password reset email sent successfully",
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = Date.now() + 15 * 60 * 1000;

        user.resetToken = hashedResetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save({ validateBeforeSave: false });

        await sendResetEmail(user.email, resetToken);

        return res.status(200).json({
            success: true,
            message: "Password reset email sent successfully",
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const validation = resetPasswordSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: getValidationMessage(validation, "Invalid password reset request"),
            });
        }

        const { resetToken, newPassword } = validation.data;
        const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        const user = await User.findOne({
            resetToken: hashedResetToken,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid or expired reset token!" 
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};
