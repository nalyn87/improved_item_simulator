import express from "express";
import { userPrisma } from "../utils/prisma/index.js";
import { gamePrisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 캐릭터 인벤토리 조회 API
router.get(
  "/inventory/:characterId",
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
        where: {
          characterId: +characterId,
        },
      });
      
      // 캐릭터가 존재하는지 확인
      if (!character) {
        return res
        .status(404)
        .json({ message: "해당 캐릭터가 존재하지 않습니다!" });
      }
      
      // 해당 아이디로 만든 캐릭터인지 확인
      if (character.UserId !== userId) {
        return res
          .status(401)
          .json({ message: "다른 계정으로 만들어진 캐릭터입니다!" });
      }

      const characterInventory = await userPrisma.inventory.findMany({
        where: { CharacterId: +characterId },
        select: {
          itemId: true,
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
router.patch(
  "/buy-items/:characterId",
  authMiddleware,
  async (req, res, next) => {
    try {
      // 로그인했는지 확인
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "로그인이 필요한 서비스입니다!" });
      }
      
      const { characterId } = req.params;
      const { userId } = req.user;
      const itemData = req.body;
      
      const character = await userPrisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
      });
      
      // 캐릭터가 존재하는지 확인
      if (!character) {
        return res
        .status(404)
        .json({ message: "해당 캐릭터가 존재하지 않습니다!" });
      }
      
      // 해당 아이디로 만든 캐릭터인지 확인
      if (character.UserId !== userId) {
        return res
          .status(401)
          .json({ message: "다른 계정으로 만들어진 캐릭터입니다!" });
      }


      let sum = 0;

      for (const data of itemData) {
        // 아이템이 존재하는지 확인
        const item = await gamePrisma.items.findFirst({
          where: { itemId: data.itemId },
        });
        if (!item) {
          return res
            .status(404)
            .json({ message: "아이템이 존재하지 않습니다!" });
        }

        // 갯수가 올바른지 확인
        if (data.count < 1) {
          return res
            .status(400)
            .json({ message: "아이템의 갯수가 올바르지 않습니다!" });
        }

        sum += item.price * data.count;
      }

      // 보유 돈 확인
      if (sum > character.money) {
        return res
          .status(400)
          .json({ message: "소유하고 있는 돈이 충분하지 않습니다!" });
      }


      for (const data of itemData) {
        await userPrisma.$transaction( async (tx) => {
          const characterInventory = await userPrisma.inventory.findFirst({
            where: {
              itemId: data.itemId,
              CharacterId: +characterId,
            },
          });
  
          if (!characterInventory) {
            await tx.inventory.create({
              data: {
                CharacterId: +characterId,
                itemId: data.itemId,
                count: data.count,
              },
            });
          } else {
            await tx.inventory.updateMany({
              where: {
                itemId: data.itemId,
                CharacterId: +characterId
              },
              data: { count: characterInventory.count + data.count },
            });
          }
  
          const item = await gamePrisma.items.findFirst({
            where: {itemId: data.itemId}
          })
  
          await tx.characters.update({
            where: { characterId: +characterId },
            data: { money: character.money - sum },
          });
        })
      }

      const patchedCharacter = await userPrisma.characters.findFirst({
        where: {characterId: +characterId}
      })

      return res.status(201).json({
        message: "정상적으로 구매가 되었습니다!",
        잔액: patchedCharacter.money,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 아이템 판매 API
router.patch(
  "/sell-items/:characterId",
  authMiddleware,
  async (req, res, next) => {
    try {
      // 로그인했는지 확인
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "로그인이 필요한 서비스입니다!" });
      }

      const { characterId } = req.params;
      const { userId } = req.user;
      const itemData = req.body;

      const character = await userPrisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
      });

      // 캐릭터가 존재하는지 확인
      if (!character) {
        return res
          .status(404)
          .json({ message: "해당 캐릭터가 존재하지 않습니다!" });
      }

      // 해당 아이디로 만든 캐릭터인지 확인
      if (character.UserId !== userId) {
        return res
          .status(401)
          .json({ message: "다른 계정으로 만들어진 캐릭터입니다!" });
      }

      let sum = 0;

      for (const data of itemData) {
        // 인벤토리에 아이템이 있는지 확인
        const characterInventory = await userPrisma.inventory.findFirst({
          where: {
            CharacterId: +characterId,
            itemId: data.itemId,
          },
        });
        if (!characterInventory) {
          return res
            .status(404)
            .json({ message: `아이템 '${data.itemId}'이/가 인벤토리에 없습니다!` });
        }

        // 갯수가 올바른지 확인
        if (data.count < 1 || data.count > characterInventory.count) {
          return res
            .status(400)
            .json({ message: "아이템의 갯수가 올바르지 않습니다!" });
        }

        const item = await gamePrisma.items.findFirst({
          where: {
            itemId: data.itemId,
            CharacterId: characterId,
          }
        })
        sum += item.price * data.count * 3/5;
      }

      for (const data of itemData) {
        await userPrisma.$transaction( async (tx) => {
          const itemInInv = await userPrisma.inventory.findFirst({
            where: {
              itemId: data.itemId,
              CharacterId: characterId,
            },
          });
  
          if (itemInInv.count === data.count) {
            await tx.inventory.delete({
              where: { 
                temId: data.itemId,
                CharacterId: characterId,
              },
            });
          } else {
            await tx.inventory.updateMany({
              where: {
                itemId: data.itemId,
                CharacterId: characterId,
              },
              data: {
                count: itemInInv.count - data.count,
              },
            });
          }

          const item = await gamePrisma.items.findFirst({
            where: {itemId: data.itemId}
          })

          await tx.characters.update({
            where: {characterId: +characterId},
            data: {
              money: character.money + item.price
            }
          })
        })
      }

      const patchedCharacter = await userPrisma.characters.findFirst({
        where: {characterId: +characterId}
      })

      return res.status(200).json({
        message: "정상적으로 판매되었습니다!",
        잔액: patchedCharacter.money,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
