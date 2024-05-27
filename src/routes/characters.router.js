import express from "express";
import { userPrisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 캐릭터 생성 API -> JWT 인증 필요
router.post("/characters", authMiddleware, async (req, res, next) => {
  try {
      if (!req.user) {
          return res.status(401).json({ message: "로그인이 필요한 서비스입니다!" });
        }
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
    
    const inventory = await userPrisma.inventory.create({
      data: {
        CharacterId: character.characterId,
        Item: {},
      },
    });

    const equipment = await userPrisma.equipment.create({
      data: {
        CharacterId: character.characterId,
      },
    });

    return res.status(200).json({ data: character });
  } catch (err) {
    next(err);
  }
});

// 캐릭터 삭제 API -> JWT 인증 필요
router.delete(
  "/characters/:characterId",
  authMiddleware,
  async (req, res, next) => {
    try {
        if (!req.user) {
          return res
            .status(401)
            .json({ message: "로그인이 필요한 서비스입니다!" });
        }
      const { characterId } = req.params;
      const { userId } = req.user;

      const character = await userPrisma.characters.findFirst({
        where: { characterId: +characterId },
      });
      if (!character) {
        return res.status(404).json({ message: "존재하지 않는 캐릭터입니다!" });
      }

      await userPrisma.characters.delete({
        where: { characterId: +characterId },
      });

      return res.status(200).json({
        message: `캐릭터 '${character.name}' 이/가 정상적으로 삭제되었습니다!`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 캐릭터 상세 조회 API
router.get("/characters/:characterId", authMiddleware, async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const targetUser = await userPrisma.characters.findFirst({where: {characterId: +characterId}});

      let check = true;
      if (!req.user) {
        check = false;
      } else if (req.user.userId !== targetUser.UserId) {
        check = false;
      }

      const character = await userPrisma.characters.findFirst({
        where: { characterId: +characterId },
        select: {
          name: true,
          health: true,
          power: true,
          money: check,
        },
      });

      if (!character) {
        return res.status(404).json({ message: "존재하지 않는 캐릭터입니다!" });
      }

      return res.status(200).json({ character });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
