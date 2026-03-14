import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minLength: 1,
            maxLength: 50,
        },
        surname: {
            type: String,
            trim: true,
            minLength: 1,
            maxLength: 50,
            default: "",
        },
        avatar: {
            type: String,
            default: ""
        },
        avatarPublicId: {
            type: String,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
        },
        password: {
            type: String,
            required: function() {
                return !this.googleId;
            },
            minLength: 6,
            select: false,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        provider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
        },
    },
    {timestamps: true}
)

const User = mongoose.model("User", UserSchema);
export default User;