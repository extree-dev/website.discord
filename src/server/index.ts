import express from "express";
import cors from "cors";
import router from "./routes/auth"; // обязательно добавить .ts

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", router);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
