import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

export async function connectDatabase() {
  await prisma.$connect();

  console.log("PostgreSQL connected");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();

  console.log("PostgreSQL disconnected");
}
