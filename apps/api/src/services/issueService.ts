import { PrismaClient } from "../../src/generated/prisma/client"

export class IssueService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.issue.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        updates: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    })
  }

  async create(data: {
    projectId: string
    featureId?: string
    title: string
    description?: string
    priority: number
    status: string
    metadata?: any
  }) {
    return this.prisma.issue.create({
      data: {
        projectId: data.projectId,
        featureId: data.featureId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        metadata: data.metadata || {},
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
      },
    })
  }

  async listByProject(projectId: string) {
    return this.prisma.issue.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.issue.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
      },
    })
  }

  async delete(id: string) {
    return this.prisma.issue.delete({
      where: { id },
      select: { id: true },
    })
  }
}
