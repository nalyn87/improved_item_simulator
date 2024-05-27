import express from 'express';
import { userPrisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// 돈 버는 API
router.patch('/make-money/:characterId', authMiddleware, async (req, res, next) => {
    try {
        // 로그인했는지 확인
    if (!req.user) {
        return res
          .status(401)
          .json({ message: "로그인이 필요한 서비스입니다!" });
      }
  
      const {characterId} = req.params;
      const {userId} = req.user;
  
      // 해당 아이디로 만든 캐릭터인지 확인
      const character = await userPrisma.characters.findFirst({
        where: {
            characterId: +characterId,
        }
      })
      if (character.UserId !== userId) {
        return res.status(401).json({message: '다른 계정으로 만들어진 캐릭터입니다!'})
      }
  
      // 캐릭터가 존재하는지 확인
      if (!character) {
        return res.status(404).json({ message: "해당 캐릭터가 존재하지 않습니다!" });
      }

      const patchedCharacter = await userPrisma.characters.update({
        where: {characterId: +characterId},
        data: {
            money: character.money + 100,
        }
      })

      return res.status(200).json({message: '100원을 벌었습니다!', '잔액': patchedCharacter.money})
    } catch (err) {
        next(err);
    }
})

export default router;