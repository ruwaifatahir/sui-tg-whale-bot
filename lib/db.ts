import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createBotGroup = async (data: Prisma.BotGroupCreateInput) => {
  return await prisma.botGroup.create({
    data,
  });
};

export const getBotGroups = async (userId: string) => {
  return await prisma.botGroup.findMany({
    where: {
      addedBy: userId,
    },
  });
};

export const getBotGroup = async (groupId: string) => {
  return await prisma.botGroup.findFirst({
    where: { groupId },
  });
};

export const updateBotGroup = async (
  groupId: string,
  data: Prisma.BotGroupUpdateInput
) => {
  return await prisma.botGroup.update({
    where: {
      groupId,
    },
    data,
  });
};

export const deleteBotGroup = async (groupId: string) => {
  return await prisma.botGroup.delete({
    where: {
      groupId,
    },
  });
};
