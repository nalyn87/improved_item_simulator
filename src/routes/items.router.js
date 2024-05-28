import express from "express";
import { gamePrisma } from "../utils/prisma/index.js";
import { userPrisma } from "../utils/prisma/index.js";

const router = express.Router();

// 아이템 생성 API
router.post("/items", async (req, res, next) => {
  try {
    const { name, health, power, price } = req.body;

    const isExitsItem = await gamePrisma.items.findFirst({ where: { name } });
    if (isExitsItem) {
      return res.status(409).json({ message: "이미 존재하는 아이템입니다!" });
    }

    const item = await gamePrisma.items.create({
      data: {
        name,
        health,
        power,
        price,
      },
    });

    return res.status(201).json({ message: '아이템이 정상적으로 생성되었습니다!', item });
  } catch (err) {
    next(err);
  }
});

// 아이템 수정 API
router.patch("/items/:itemId", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const updatedItem = req.body;
    const itemInfo = await gamePrisma.items.findFirst({
      where: { itemId: +itemId },
    });
    if (!itemInfo) {
      return res
        .status(404)
        .json({ errorMessage: "해당하는 아이템이 존재하지 않습니다!" });
    }

    await gamePrisma.items.update({
      data: {
        ...updatedItem,
      },
      where: { itemId: +itemId },
    });
    
    const itemsInEqu = await userPrisma.equipment.findMany({
      where: {
        itemId: +itemId
      }
    })

    const character = await userPrisma.characters.findMany({
      where: {characterId: itemsInEqu.CharacterId}
    })

    const changePower = updatedItem.power - itemInfo.power;
    const changeHealth = updatedItem.health - itemInfo.health;

    for (const char of character) {
      await userPrisma.characters.update({
        where: {characterId: char.characterId},
        data: {
          power: (char.power + changePower),
          health: (char.health + changeHealth)
        }
      })
    }

    return res.status(200).json({ message: "아이템 수정이 완료되었습니다!" });
  } catch (err) {
    next(err);
  }
});

// 아이템 목록 조회 API
router.get("/items", async (req, res, next) => {
  try {
    const items = await gamePrisma.items.findMany({
      select: {
        itemId: true,
        name: true,
        price: true,
      },
      orderBy: { itemId: "asc" },
    });

    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
});

// 아이템 상세 조회 API
router.get("/items/:itemId", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await gamePrisma.items.findFirst({
      where: { itemId: +itemId }
    });
    if(!item) {
        return res.status(404).json({errorMessage: '해당하는 아이템이 존재하지 않습니다!'})
    }

    return res.status(200).json({ item });
  } catch (err) {
    next(err);
  }
});

export default router;
