import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import router from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import 'module-alias/register';
import { addAlias } from "module-alias";
import { setupModerationRoutes } from './api/moderation.js'
import { setupUserRoutes } from "./api/users.js";

addAlias('@', __dirname);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Discord Client ID:', process.env.DISCORD_CLIENT_ID);
console.log('Discord Redirect URI:', process.env.DISCORD_REDIRECT_URI);

const app = express();
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not defined in .env file')
    process.exit(1)
}
app.use(cors());
app.use(express.json());
app.use("/admin", adminRoutes);


app.use("/api", router);

setupModerationRoutes(app)
setupUserRoutes(app)

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});