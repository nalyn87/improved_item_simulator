import express from "express";
import { userPrisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 캐릭터 생성 API -> JWT 인증 필요
router.post('/characters', authMiddleware, async (req, res, next) => {
  try {
    console.log(req.user);
    const { userId } = req.user;
    const { name } = req.body;

    const isExitscharater = await userPrisma.characters.findFirst({
      where: { name },
    });
    if (isExitscharater) {
      return res
        .status(409)
        .json({ message: "이미 존재하는 캐릭터 이름입니다!" });
    }

    const character = await userPrisma.characters.create({
      data: {
        UserId: userId,
        name,
      },
    }); 

    return res.status(200).json({ data: character });
  } catch (err) {
    next(err);
  }
});


export default router;