import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import router from "./routes/auth";
import adminRoutes from "./routes/admin";
import 'module-alias/register';
import { addAlias } from "module-alias";

addAlias('@', __dirname);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Discord Client ID:', process.env.DISCORD_CLIENT_ID);
console.log('Discord Redirect URI:', process.env.DISCORD_REDIRECT_URI);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/admin", adminRoutes);

app.use("/api", router);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});