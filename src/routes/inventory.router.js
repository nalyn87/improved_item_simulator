import express from "express";
import { userPrisma } from "../utils/prisma/index.js";
import { gamePrisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 캐릭터 인벤토리 조회 API
router.get("/inventory/:characterId", authMiddleware, async (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "로그인이 필요한 서비스입니다!" });
      }

      const { characterId } = req.params;
      const { userId } = req.user;

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
      
      const characterInventory = await userPrisma.items.findMany({
        where: { CharacterIdInv: +characterId },
        select: {
          ItemId: true,
          count: true,
        }
      });

      return res.status(200).json({ characterInventory });
    } catch (err) {
      next(err);
    }
  }
);

// 아이템 구입 API
router.patch('/buy-items/:characterId', authMiddleware, async (req, res, next) => {
  try {
    // 로그인했는지 확인
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "로그인이 필요한 서비스입니다!" });
    }

    const {characterId} = req.params;
    const {userId} = req.user;
    const {itemId, count} = req.body;

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

    // 아이템이 존재하는지 확인
    const item = await gamePrisma.items.findFirst({where: {itemId: +itemId}})
    if (!item) {
      return res.status(404).json({message: '아이템이 존재하지 않습니다!'})
    }

    // 갯수가 올바른지 확인
    if (count < 1) {
      return res.status(404).json({message: '아이템의 갯수가 올바르지 않습니다!'})
    }

    // 보유 돈 확인
    if (item.price * count > character.money) {
      return res.status(400).json({message: '소유하고 있는 돈이 충분하지 않습니다!'})
    }

    const characterInventory = await userPrisma.items.findMany({
      where: { CharacterIdInv: +characterId },
    });

    if (characterInventory.ItemId === Number(itemId)) {
      await userPrisma.inventory.update({
        where: {CharacterIdInv: +characterId},
        data: {count: characterInventory.count + count}
      })
    } else {
      await userPrisma.items.createMany({
        data: {
          ItemId: +itemId,
          count: +count,
          CharacterIdInv: +characterId
        }
      })
    }

    const leftMoney = await userPrisma.characters.update({
      where: {characterId: +characterId},
      data: {money: character.money - (item.price * count)}
    })

    return res.status(201).json({message: '정상적으로 구매가 되었습니다!', '잔액': leftMoney.money})
  } catch (err) {
    next(err);
  }
})

// 아이템 판매 API
router.patch('/sell-items/:characterId', authMiddleware, async (req, res, next) => {
  try {
    // 로그인했는지 확인
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "로그인이 필요한 서비스입니다!" });
    }

    const {characterId} = req.params;
    const {userId} = req.user;
    const {itemId, count} = req.body;

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

    // 인벤토리에 아이템이 있는지 확인
    const characterInventory = await userPrisma.items.findMany({
      where: {
        CharacterIdInv: +characterId,
        ItemId: +itemId,
      }
    })
    if (!characterInventory) {
      return res.status(404).json({message: '해당 아이템이 인벤토리에 없습니다!'})
    }

    // 갯수가 올바른지 확인
    if (count < 1) {
      return res.status(404).json({message: '아이템의 갯수가 올바르지 않습니다!'})
    }

    await userPrisma.items.deleteMany({
      where: {
        CharacterIdInv: +characterId,
        ItemId: +itemId,
      }
    })

    const item = await gamePrisma.items.findFirst({
      where: {itemId: +itemId}
    })

    const leftMoney = await userPrisma.characters.update({
      where: {characterId: +characterId},
      data: {
        money: character.money + (item.price * count * 3/5)
      }
    })

    return res.status(200).json({message: '정상적으로 판매되었습니다!', '잔액': leftMoney.money})
  } catch (err) {
    next(err);
  }
})














export default router;
