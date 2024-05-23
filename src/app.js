import express from "express";
import ItemRouter from './routes/items.router.js';
import ErrorHandlingMiddleware from './middlewares/error_handling.middleware.js';

const app = express();
const PORT = 3000;

const router = express.Router();

router.get("/", async (req, res) => {
  res.status(200).json({ message: "테스트 성공!" });
});

app.use(express.json());
app.use("/api", [router, ItemRouter]);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
