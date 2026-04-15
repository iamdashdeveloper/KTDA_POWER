export const companySchemas = {
  create: {
    description: "Create a new company",
    tags: ["Companies"],
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        description: { type: "string" },
        location: {
          type: "object",
          properties: {
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
          },
        },
        metadata: { type: "object" },
      },
    },
    response: {
      201: {
        description: "Company created successfully",
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
  list: {
    description: "List all companies",
    tags: ["Companies"],
    response: {
      200: {
        description: "List of companies",
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  },
  getById: {
    description: "Get company by ID",
    tags: ["Companies"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
      },
    },
  },
}
