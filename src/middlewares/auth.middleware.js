import jwt from "jsonwebtoken";
import { userPrisma } from "../utils/prisma/index.js";

export default async (req, res, next) => {
    try {
    if (!req.headers.authorization) {
        next();
        return;
    }

    const { authorization } = req.headers;
    if (!authorization) {
        throw new Error("Access Token이 존재하지 않습니다!")
    }

    const [tokenType, token] = authorization.split(" ");
    if (tokenType !== "Bearer") {
      throw new Error("토큰 타입이 일치하지 않습니다!");
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userId = decodedToken.userId;

    const user = await userPrisma.users.findFirst({ where: { userId } });
    if (!user) {
      throw new Error("토큰 사용자가 존재하지 않습니다!");
    }

    req.user = user;
    next();
  } catch (err) {
    switch (err.name) {
      case "JsonWebTokenError":
        return res.status(401).json({ message: "토큰이 잘못되었습니다!" });
      default:
        return res
          .status(401)
          .json({ message: err.message ?? "비정상적인 요청입니다!" });
    }
  }
};
