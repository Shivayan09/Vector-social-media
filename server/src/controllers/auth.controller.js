import User from "../models/User.js"
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    const {name, surname, phoneNumber, email, password} = req.body;
    if(!name) {
        return res.json(400).json({
            success: false,
            message: "Please enter your name!"
        })
    }
    if(!phoneNumber) {
        return res.status(400).json({
            success: false,
            message: "Please enter your phone number!"
        })
    }
    if(!email) {
        return res.status(400).json({
            success: false,
            message: "Please enter your email!"
        })
    }
    if(!password) {
        return res.status(400).json({
            success: false,
            message: "Please enter a password!"
        })
    }
    try {
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists!"
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({name, surname, phoneNumber, email, password: hashedPassword, signupstep: 1, isProfileComplete: false});
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
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

export const profileSetup = async(req, res) => {
    const {username, bio, description} = req.body;
    if(!username) {
        return res.json(400).json({
            success: false,
            message: "Please enter a username!"
        })
    }
    if(!bio) {
        return res.json(400).json({
            success: false,
            message: "Please enter a bio!"
        })
    }
    if(!description) {
        return res.json(400).json({
            success: false,
            message: "Please enter a description!"
        })
    }
    try {
        const user = await User.findById(req.user.id)
        if(!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!"
            })
        }
        user.username = username;
        user.bio = bio;
        user.description = description;
        await user.save();
        return res.status(200).json({
            success: false,
            message: "Profile completed successfully!"
        })
    } catch(error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}