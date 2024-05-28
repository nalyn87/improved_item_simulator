import express from "express";
import { userPrisma } from "../utils/prisma/index.js";
import { gamePrisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/equipment/:characterId", async (req, res, next) => {
  try {
    const { characterId } = req.params;

    const character = await userPrisma.characters.findFirst({
      where: {
        characterId: +characterId,
      },
    });

    // 캐릭터가 존재하는지 확인
    if (!character) {
      return (
        res.status(404), json({ message: "해당 캐릭터가 존재하지 않습니다!" })
      );
    }

    const equipment = await userPrisma.equipment.findMany({
      where: { CharacterId: +characterId },
    });

    const item = [];
    for (const i of equipment) {
        const targetItem = await gamePrisma.items.findFirst({
          where: { itemId: i.itemId },
          select: {
            itemId: true,
            name: true,
          },
        });
        item.push(targetItem);
    }

    return res.status(200).json({ item });
  } catch (err) {
    next(err);
  }
});

// 아이템 장착 API
router.post("/equip/:characterId", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요한 서비스입니다!" });
    }

    const { characterId } = req.params;
    const items = req.body;
    const { userId } = req.user;

    const character = await userPrisma.characters.findFirst({
      where: { characterId: +characterId },
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
    
    for (const i of items) {
        // 해당 아이템이 인벤에 존재하는지 확인
        const itemInInv = await userPrisma.inventory.findMany({
            where: { itemId: i.itemId },
        });
        if (!itemInInv.length) {
            return res
            .status(404)
            .json({ message: `아이템 '${i.itemId}'이/가 인벤토리에 존재하지 않습니다!` });
        }

        // 해당 아이템을 장착하고 있는지 확인
        const itemInEqu = await userPrisma.equipment.findFirst({
          where: { 
            itemId: +i.itemId,
            CharacterId: +characterId,
        },
        });
        if (itemInEqu) {
          return res
            .status(400)
            .json({ message: "해당 아이템을 이미 장착하고 있습니다!" });
        }
    }

    // 아이템 장착
    for (const i of items) {
        const [equipment] = await userPrisma.$transaction(
          async (tx) => {
            const equipment = await tx.equipment.create({
              data: {
                CharacterId: +characterId,
                itemId: +i.itemId,
              },
            });

            const item = await gamePrisma.items.findFirst({
                where: {itemId: +i.itemId}
            })

            const patchedCharacter = await userPrisma.characters.findFirst({
                where: {characterId: +characterId}
            })
        
            // 스탯 증가
            await tx.characters.update({
                where: {characterId: +characterId},
                data: {
                    power: patchedCharacter.power + item.power,
                    health: patchedCharacter.health + item.health,
                }
            })

            const itemInInv = await userPrisma.inventory.findFirst({
                where: {itemId: i.itemId}
            })

            // 인벤에서 삭제 or 카운트 줄이기
            if (itemInInv.count === 1) {
                await tx.inventory.deleteMany({
                    where: {
                        CharacterId: +characterId,
                        itemId: i.itemId,
                    },
                })
            } else {
                await tx.inventory.updateMany({
                    where: {
                        CharacterId: +characterId,
                        itemId: i.itemId,
                    },
                    data: {
                        count: itemInInv.count - 1,
                    }
                })
            }

            return [equipment];
          },
          {
            isolationLevel: "ReadCommitted"
          }
        );
    }

    return res
      .status(201)
      .json({ message: "아이템이 정상적으로 장착되었습니다!"});
  } catch (err) {
    next(err);
  }
});

// 아이템 탈착 API
router.delete("/unequip/:characterId", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요한 서비스입니다!" });
    }

    const { characterId } = req.params;
    const items = req.body;
    const { userId } = req.user;

    const character = await userPrisma.characters.findFirst({
      where: { characterId: +characterId },
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
    
    for (const i of items) {
        // 해당 아이템을 장착하고 있는지 확인
        const itemInEqu = await userPrisma.equipment.findFirst({
          where: {
            itemId: i.itemId,
            CharacterId: +characterId
          },
        });
        if (!itemInEqu) {
          return res
            .status(404)
            .json({ message: `아이템 '${i.itemId}'을/를 장착하고 있지 않습니다!` });
        }
    }

    // 아이템 탈착
    for (const i of items) {
        await userPrisma.$transaction( async (tx) => {
            await tx.equipment.deleteMany({
                where: {
                    CharacterId: +characterId,
                    itemId: i.itemId,
                }
            });

            const item = await gamePrisma.items.findFirst({
                where: {itemId: +i.itemId}
            })

            const patchedCharacter = await userPrisma.characters.findFirst({
                where: {characterId: +characterId}
            })

            // 스탯 감소
            await tx.characters.update({
                where: {characterId: +characterId},
                data: {
                    power: patchedCharacter.power - item.power,
                    health: patchedCharacter.health - item.health,
                }
            })

            const itemInInv = await userPrisma.inventory.findFirst({
                where: {itemId: i.itemId}
            })

            // 인벤에 추가 or 카운트 증가
            if (!itemInInv) {
                await tx.inventory.create({
                    data: {
                        CharacterId: +characterId,
                        itemId: i.itemId,
                        count: 1,
                    }
                })
            } else {
                await tx.inventory.updateMany({
                    where: {
                        CharacterId: +characterId,
                        itemId: i.itemId,
                    },
                    data: {
                        count: itemInInv.count + 1,
                    }
                })
            }
          },
          {
            isolationLevel: "ReadCommitted"
          }
        );
    }

    return res
      .status(200)
      .json({ message: "아이템이 정상적으로 탈착되었습니다!"});
  } catch (err) {
    next(err);
  }
});

export default router;
