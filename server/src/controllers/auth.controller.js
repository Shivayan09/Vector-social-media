import User from "../models/user.model.js"
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';

export const register = async (req, res) => {
    const { name, surname, phoneNumber, email, password } = req.body;
    if (!name) {
        return res.json({
            success: false,
            message: "Please enter your name!"
        })
    }
    if (!email) {
        return res.json({
            success: false,
            message: "Please enter your email!"
        })
    }
    if (!validator.isEmail(email)) {
        return res.json({
            success: false,
            message: "Please enter a valid email!"
        })
    }
    if (!phoneNumber) {
        return res.json({
            success: false,
            message: "Please enter your phone number!"
        })
    }
    if (!validator.isMobilePhone(phoneNumber, "any")) {
        return res.json({
            success: false,
            message: "Please enter a valid phone number!"
        })
    }
    if (!password) {
        return res.json({
            success: false,
            message: "Please enter a password!"
        })
    }
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({
                success: false,
                message: "User already exists!"
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, surname, phoneNumber, email, password: hashedPassword, signupStep: 1, isProfileComplete: false });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
            success: true,
            message: "Account created successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const profileSetup = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { username, bio, description } = req.body;
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
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!",
            });
        }
        if (user.isProfileComplete) {
            return res.json({
                success: false,
                message: "Profile already completed!",
            });
        }
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.json({
                success: false,
                message: "Username already taken!",
            });
        }
        user.username = username;
        user.bio = bio;
        user.description = description;
        user.isProfileComplete = true;
        user.signupStep = 2;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Profile completed successfully!",
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
            phoneNumber: user.phoneNumber,
            username: user.username,
            bio: user.bio,
            description: user.description,
            avatar: user.avatar,
            isProfileComplete: user.isProfileComplete,
            signupStep: user.signupStep,
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