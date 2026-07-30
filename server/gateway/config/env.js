import dotenv from "dotenv";

dotenv.config();

export default {
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
};