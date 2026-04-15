import { PrismaClient } from "../../src/generated/prisma/client"

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        position: true,
        avatarUrl: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
      },
    })
  }

  async create(data: {
    companyId: bigint
    email: string
    password: string
    firstName: string
    lastName: string
    position: string
    bio?: string
    avatarUrl?: string
    metadata?: any
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        metadata: data.metadata || {},
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        position: true,
      },
    })
  }

  async update(id: bigint, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        position: true,
      },
    })
  }

  async delete(id: bigint) {
    return this.prisma.user.delete({
      where: { id },
      select: { id: true },
    })
  }

  async listByCompany(companyId: bigint) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        position: true,
        avatarUrl: true,
      },
    })
  }
}
