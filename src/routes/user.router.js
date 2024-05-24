import express from "express";
import { userPrisma } from "../utils/prisma/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

// 회원가입 API
router.post("/users/sign-up", async (req, res, next) => {
  try {
    const { name, signUpId, password, password_confirmed } = req.body;

    const regex = /^[a-z0-9]*$/;
    if (regex.test(signUpId) === false) {
      return res
        .status(400)
        .json({ message: "아이디는 영어 소문자와 숫자만 가능합니다!" });
    }

    const isExitsItem = await userPrisma.users.findFirst({
      where: { signUpId },
    });
    if (isExitsItem) {
      return res.status(409).json({ message: "이미 존재하는 아이디입니다!" });
    }

    if (password < 6) {
      return res
        .status(400)
        .json({ message: "비밀번호는 6글자 이상이어야합니다!" });
    }

    if (password !== password_confirmed) {
      return res
        .status(400)
        .json({ message: "비밀번호 확인이 일치하지 않습니다!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userPrisma.users.create({
      data: {
        name,
        signUpId,
        password: hashedPassword,
      },
    });

    return res.status(201).json({ name: user.name, signUpId: user.signUpId });
  } catch (err) {
    next(err);
  }
});

// 로그인 API
router.post("/users/sign-in", async (req, res, next) => {
  try {
    const { signUpId, password } = req.body;

    const user = await userPrisma.users.findFirst({ where: { signUpId } });
    if (!user) {
      return res.status(404).json({ message: "존재하지 않는 아이디입니다!" });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "비밀번호가 일치하지 않습니다!" });
    }

    const accessToken = createAccessToken(user.userId);

    return res
      .status(200)
      .json({
        message: "로그인에 성공하였습니다!",
        authorization: `Bearer ${accessToken}`,
      });
  } catch (err) {
    next(err);
  }
});

function createAccessToken(userId) {
    return jwt.sign({userId}, process.env.JWT_SECRET_KEY, {expiresIn: '1d'});
}

export default router;
