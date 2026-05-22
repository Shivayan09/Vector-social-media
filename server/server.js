import "dotenv/config";
import connectDB from "./src/config/mongodb.js";
import { initSocket } from "./src/socket/socket.js";
import app from "./src/app.js";

await connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

initSocket(server);