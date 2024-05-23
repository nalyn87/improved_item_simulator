import { PrismaClient as GamePrismaClient } from '../../../prisma/game/index.js';
import { PrismaClient as UserPrismaClient } from '../../../prisma/user/index.js';

export const gamePrisma = new GamePrismaClient({
  log: ['query', 'info', 'warn', 'error'],

  errorFormat: 'pretty',
});

export const userPrisma = new UserPrismaClient({
  log: ['query', 'info', 'warn', 'error'],

  errorFormat: 'pretty',
});