import { PrismaClient } from "../../src/generated/prisma/client"

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
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
    companyId: string
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
        companyId: data.companyId,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
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

  async update(id: string, data: any) {
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

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
      select: { id: true },
    })
  }

  async listByCompany(companyId: string) {
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
