import { PrismaClient } from "../../src/generated/prisma/client"

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: bigint) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            roleType: true,
          },
        },
      },
    })
  }

  async create(data: {
    companyId: bigint
    name: string
    description?: string
    metadata?: any
  }) {
    return this.prisma.project.create({
      data: {
        ...data,
        metadata: data.metadata || {},
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    })
  }

  async listByCompany(companyId: bigint) {
    return this.prisma.project.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })
  }

  async update(id: bigint, data: any) {
    return this.prisma.project.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
      },
    })
  }

  async delete(id: bigint) {
    return this.prisma.project.delete({
      where: { id },
      select: { id: true },
    })
  }
}
