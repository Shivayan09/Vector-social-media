import User from "../models/user.model.js"
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const sendResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS,
        },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Password Reset',
        html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    };

    await transporter.sendMail(mailOptions);
};

export const register = async (req, res) => {
    try {
        const {
            name,
            surname,
            phoneNumber,
            email,
            password,
            username,
            bio,
            description,
        } = req.body;

        // basic validations
        if (!name) {
            return res.json({ success: false, message: "Please enter your name!" });
        }

        if (!email) {
            return res.json({ success: false, message: "Please enter your email!" });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email!" });
        }

        if (!phoneNumber) {
            return res.json({
                success: false,
                message: "Please enter your phone number!",
            });
        }

        if (!validator.isMobilePhone(phoneNumber, "any")) {
            return res.json({
                success: false,
                message: "Please enter a valid phone number!",
            });
        }

        if (!password) {
            return res.json({
                success: false,
                message: "Please enter a password!",
            });
        }

        if (!username) {
            return res.json({
                success: false,
                message: "Please enter a username!",
            });
        }

        if (!bio) {
            return res.json({
                success: false,
                message: "Please enter a bio!",
            });
        }

        if (!description) {
            return res.json({
                success: false,
                message: "Please enter a description!",
            });
        }

        // check existing email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({
                success: false,
                message: "User already exists!",
            });
        }

        // check username
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.json({
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
            isProfileComplete: true,
        });

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

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

export const getMe = (req, res) => {
    const user = req.user;
    return res.status(200).json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            username: user.username,
            bio: user.bio,
            description: user.description,
            avatar: user.avatar,
            followers: user.followers.map(id => id.toString()),
            following: user.following.map(id => id.toString()),
        },
    });
};

export const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username) {
        return res.json({
            success: false,
            message: "Enter your username!"
        })
    }
    if (!password) {
        return res.json({
            success: false,
            message: "Enter your password!"
        })
    }
    try {
        const user = await User.findOne({ username }).select("+password");
        if (!user) {
            return res.json({
                success: false,
                message: "User not found!"
            })
        }
        const matched = await bcrypt.compare(password, user.password)
        if (!matched) {
            return res.json({
                success: false,
                message: "Incorrect password!"
            })
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
            success: true,
            message: "Logged In successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
        })
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.json({ success: false, message: "Please enter your email!" });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save({ validateBeforeSave: false });

        await sendResetEmail(user.email, resetToken);

        return res.status(200).json({
            success: true,
            message: "Password reset email sent successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.json({ success: false, message: "Please provide token and new password!" });
        }

        const user = await User.findOne({
            resetToken,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token!" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};