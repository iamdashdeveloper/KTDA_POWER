import { FastifyInstance } from "fastify"

// Issue types for hydro projects
const ISSUE_TYPES: Record<string, string> = {
  "1": "water_shortage",
  "2": "low_pressure",
  "3": "service_interruption",
  "4": "canal_overflow",
  "5": "equipment_damage",
  "6": "other",
}

const ISSUE_TYPES_DISPLAY: Record<string, string> = {
  "1": "Water Shortage",
  "2": "Low Pressure",
  "3": "Service Interruption",
  "4": "Canal Overflow",
  "5": "Equipment Damage",
  "6": "Other",
}

// Severity levels
const SEVERITY_LEVELS: Record<string, string> = {
  "1": "low",
  "2": "medium",
  "3": "high",
}

const SEVERITY_DISPLAY: Record<string, string> = {
  "1": "Low",
  "2": "Medium",
  "3": "High",
}

// Cache for session data (in production, use Redis)
const sessionCache: Record<string, any> = {}

/**
 * Format projects list for USSD display
 */
function formatProjectsList(projects: any[]): string {
  let menu = "CON Select the project you are associated with:\n"
  projects.forEach((project, index) => {
    menu += `${index + 1}. ${project.name}\n`
  })
  return menu
}

/**
 * Format issue types list for USSD display
 */
function formatIssueTypesList(): string {
  let menu = "CON Select the issue type:\n"
  Object.entries(ISSUE_TYPES_DISPLAY).forEach(([key, value]) => {
    menu += `${key}. ${value}\n`
  })
  return menu
}

/**
 * Format severity list for USSD display
 */
function formatSeverityList(): string {
  let menu = "CON How severe is the issue?\n"
  Object.entries(SEVERITY_DISPLAY).forEach(([key, value]) => {
    menu += `${key}. ${value}\n`
  })
  return menu
}

/**
 * Process USSD request and return response
 * This is the core logic used by both / and /ussd endpoints
 */
async function processUSSDRequest(
  sessionId: string,
  phoneNumber: string,
  text: string,
  prisma: any
): Promise<string> {
  // Ensure text is a string and not undefined
  const safText = String(text || "")

  let response = ""
  const inputChain = safText.split("*")
  const currentStep = inputChain.length

  // Initialize session if new
  if (!sessionCache[sessionId]) {
    sessionCache[sessionId] = {
      phoneNumber,
      startTime: Date.now(),
    }
  }

  const session = sessionCache[sessionId]

  // STEP 0: Initial Menu - Choose Main Option
  if (safText === "") {
    response = `CON Welcome to KTDA Hydro Issues Portal.
1. Report an issue
2. Register parcel`
  }

  // STEP 1: User selected main menu option
  else if (currentStep === 1) {
    const menuChoice = inputChain[0]

    if (menuChoice === "1") {
      // Report issue flow
      // Check if owner exists with this phone number (if table exists)
      let owner = null
      try {
        owner = await prisma.owner.findFirst({
          where: {
            phone: phoneNumber,
          },
        })
      } catch (error: any) {
        // Owner table might not exist yet, that's okay
        console.debug("Owner table not accessible:", error.code)
      }

      if (owner) {
        session.owner = owner

        // Fetch all parcels owned by this user
        try {
          const ownedParcels = await prisma.parcel.findMany({
            where: {
              ownerId: owner.id,
            },
            select: {
              id: true,
              name: true,
            },
          })

          if (ownedParcels && ownedParcels.length > 0) {
            session.ownedParcels = ownedParcels

            // Build parcel selection menu
            let parcelMenu = `CON Welcome back, ${owner.name}!\nSelect your plot:\n`
            ownedParcels.forEach((parcel: { name: any }, index: number) => {
              parcelMenu += `${index + 1}. ${parcel.name}\n`
            })
            parcelMenu += `${ownedParcels.length + 1}. Report on a different plot`

            response = parcelMenu
          } else {
            // No parcels owned, ask for plot number
            response = `CON Welcome back, ${owner.name}!
Enter your plot number (or type 'landmark' if you don't know):`
          }
        } catch (error: any) {
          console.debug("Error fetching parcels:", error.code)
          response = `CON Welcome back, ${owner.name}!
Enter your plot number (or type 'landmark' if you don't know):`
        }
      } else {
        // New user - ask for name
        response = `CON First time here! Please enter your name:`
        session.isNewUser = true
      }
    } else if (menuChoice === "2") {
      // Register parcel
      response = `END This feature is coming soon. Please contact admin to register your parcel.`
    } else {
      response = `CON Invalid selection. Please try again.
1. Report an issue
2. Register parcel`
    }
  }

  // STEP 2: Handle user registration or plot selection
  else if (currentStep === 2) {
    const secondInput = inputChain[1]

    if (session.isNewUser) {
      // New user entering name
      session.userName = secondInput
      session.isNewUser = false

      response = `CON Thank you, ${session.userName}!
Now enter your plot number (or type 'landmark' if you don't know):`
    } else if (session.owner && session.ownedParcels) {
      // Existing user choosing from owned parcels
      const parcelChoice = parseInt(secondInput)
      const parcelsCount = session.ownedParcels.length

      if (parcelChoice > 0 && parcelChoice <= parcelsCount) {
        // Selected one of the owned parcels
        const selectedParcel = session.ownedParcels[parcelChoice - 1]
        session.selectedParcel = selectedParcel
        session.plotNumber = selectedParcel.name

        // Get projects
        try {
          const projects = await prisma.project.findMany({
            select: {
              id: true,
              name: true,
            },
          })

          if (projects.length > 0) {
            session.projects = projects
            response = formatProjectsList(projects)
          } else {
            response = `END Error loading projects. Please try again later.`
          }
        } catch (error: any) {
          console.debug("Project table not accessible:", error.code)
          response = `END Error loading projects. Please try again later.`
        }
      } else if (parcelChoice === parcelsCount + 1) {
        // Report on a different plot
        response = `CON Enter your plot number (or type 'landmark' if you don't know):`
      } else {
        response =
          `CON Invalid selection. Please try again:\n` +
          session.ownedParcels
            .map((p: any, i: number) => `${i + 1}. ${p.name}`)
            .join("\n") +
          `\n${parcelsCount + 1}. Report on a different plot`
      }
    } else if (session.owner) {
      // Existing user but no parcels list (shouldn't happen, but fallback)
      response = `CON Enter your plot number (or type 'landmark' if you don't know):`
    }
  }

  // STEP 3: Handle plot number input or project selection
  else if (currentStep === 3) {
    const thirdInput = inputChain[2]

    if (session.selectedParcel) {
      // Existing user already selected a parcel, now selecting project
      const projectIndex = parseInt(thirdInput) - 1

      if (
        session.projects &&
        projectIndex >= 0 &&
        projectIndex < session.projects.length
      ) {
        session.selectedProject = session.projects[projectIndex]
        response = formatIssueTypesList()
      } else {
        response = `CON Invalid project selection. Please try again:\n${formatProjectsList(
          session.projects
        )}`
      }
    } else {
      // New user entered plot number
      session.plotNumber = thirdInput

      // Get projects
      try {
        const projects = await prisma.project.findMany({
          select: {
            id: true,
            name: true,
          },
        })

        if (projects.length > 0) {
          session.projects = projects
          response = formatProjectsList(projects)
        } else {
          response = `END Error loading projects. Please try again later.`
        }
      } catch (error: any) {
        console.debug("Project table not accessible:", error.code)
        response = `END Error loading projects. Please try again later.`
      }
    }
  }

  // STEP 4: Handle issue type selection
  else if (currentStep === 4) {
    const issueTypeInput = inputChain[3]
    const issueTypeKey = issueTypeInput

    if (ISSUE_TYPES[issueTypeKey]) {
      if (issueTypeKey === "6") {
        // Other - ask for custom description
        session.issueType = "other"
        response = `CON Please describe the issue type:`
      } else {
        session.issueType = ISSUE_TYPES[issueTypeKey]
        response = `CON Would you like to describe what happened in more detail?
1. Yes, provide more details
2. No, proceed to submit`
      }
    } else {
      response = `CON Invalid selection. Please select an issue type:\n${formatIssueTypesList()}`
    }
  }

  // STEP 5: Handle custom issue type or proceed to description
  else if (currentStep === 5) {
    const fifthInput = inputChain[4]

    if (session.issueType === "other") {
      // Custom issue type provided
      session.customIssueType = fifthInput
      response = `CON Would you like to describe what happened in more detail?
1. Yes, provide more details
2. No, proceed to submit`
    } else {
      // Existing issue type, asking about description
      const descChoice = fifthInput

      if (descChoice === "1") {
        // Want to provide description
        response = `CON Describe what happened (be brief):`
      } else if (descChoice === "2") {
        // Skip description, go to severity
        response = formatSeverityList()
      } else {
        response = `CON Invalid selection. Please try again.
1. Yes, provide more details
2. No, proceed to submit`
      }
    }
  }

  // STEP 6: Handle description input or severity selection
  else if (currentStep === 6) {
    const sixthInput = inputChain[5]

    if (session.customIssueType) {
      // Custom issue type was provided, now handling description choice
      const descChoice = sixthInput

      if (descChoice === "1") {
        response = `CON Describe what happened (be brief):`
      } else if (descChoice === "2") {
        response = formatSeverityList()
      } else {
        response = `CON Invalid selection. Please try again.
1. Yes, provide more details
2. No, proceed to submit`
      }
    } else if (!session.description) {
      // Description provided
      session.description = sixthInput
      response = formatSeverityList()
    }
  }

  // STEP 7: Handle severity selection (final step before submission)
  else if (currentStep === 7) {
    const seventhInput = inputChain[6]
    const severity = inputChain[6]

    if (session.customIssueType) {
      // We had custom issue type, now handling description
      session.description = seventhInput
      response = formatSeverityList()
    } else {
      // Handling severity selection
      if (SEVERITY_LEVELS[severity]) {
        session.severity = SEVERITY_LEVELS[severity]

        // Submit the complaint
        try {
          // Create or get owner by phone number
          let owner = await prisma.owner.findFirst({
            where: {
              phone: phoneNumber,
            },
          })

          if (!owner) {
            // Create a new owner if doesn't exist
            owner = await prisma.owner.create({
              data: {
                name:
                  session.userName ||
                  session.owner?.name ||
                  `User ${phoneNumber}`,
                phone: phoneNumber,
                email: `${phoneNumber}@ktda.local`, // Temporary email format
              },
            })
          }

          // Try to get parcel by plotNumber, or create a default parcel
          let parcel = null
          if (session.plotNumber) {
            parcel = await prisma.parcel.findFirst({
              where: {
                name: session.plotNumber,
              },
            })
          }

          if (!parcel) {
            // Create a default parcel if it doesn't exist
            parcel = await prisma.parcel.create({
              data: {
                name: session.plotNumber || `Plot-${phoneNumber}`,
                ownerId: owner.id,
                description: "Created via USSD complaint submission",
              },
            })
          }

          // Prepare complaint data based on whether a project was selected
          let complaintData: any = {
            phoneNumber,
            name: session.userName || session.owner?.name || "USSD User",
            complaintType:
              session.customIssueType || session.issueType || "other",
            description:
              session.description ||
              ISSUE_TYPES_DISPLAY[
                Object.keys(ISSUE_TYPES).find(
                  (k) => ISSUE_TYPES[k] === session.issueType
                ) || "6"
              ] ||
              "No description provided",
            plotNumber: session.plotNumber || null,
            severity: session.severity || "medium",
            ownerId: owner.id,
            parcelId: parcel.id,
          }

          // Only set projectId if a project was selected, otherwise create a placeholder project
          if (session.selectedProject?.id) {
            complaintData.projectId = session.selectedProject.id
          } else {
            // Create or connect to a default project for complaints without a specific project
            const defaultProject = await prisma.project.findFirst({
              where: { name: "General Complaints" },
            })

            if (defaultProject) {
              complaintData.projectId = defaultProject.id
            } else {
              // Create a default project if it doesn't exist
              const newProject = await prisma.project.create({
                data: {
                  name: "General Complaints",
                  companyId: (await prisma.company.findFirst())?.id || "",
                  description:
                    "Default project for complaints without a specific project",
                },
              })
              complaintData.projectId = newProject.id
            }
          }

          const result = await prisma.complaint.create({
            data: complaintData,
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })

          if (result) {
            response = `END Thank you for reporting!
Your complaint ID: ${result.id}
Our team will investigate shortly.
Ref: ${result.id}`

            // Clean up session after successful submission
            delete sessionCache[sessionId]
          } else {
            response = `END Error submitting complaint. Please try again later.`
          }
        } catch (error) {
          console.error("Error submitting complaint:", error)
          response = `END Sorry, we could not process your report. Please try again later.`
        }
      } else {
        response = `CON Invalid selection. Please select severity:\n${formatSeverityList()}`
      }
    }
  }

  // STEP 8: Final severity selection after custom issue type
  else if (currentStep === 8) {
    const eighthInput = inputChain[7]

    if (SEVERITY_LEVELS[eighthInput]) {
      session.severity = SEVERITY_LEVELS[eighthInput]

      // Submit the complaint
      try {
        const complaintPayload = {
          phoneNumber,
          name: session.userName || session.owner?.name || "USSD User",
          complaintType: session.customIssueType || session.issueType,
          description: session.description || "No description provided",
          plotNumber: session.plotNumber || null,
          projectId: session.selectedProject?.id || null,
          severity: session.severity || "medium",
        }

        const result = await prisma.complaint.create({
          data: complaintPayload,
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        if (result) {
          response = `END Thank you for reporting!
Your complaint ID: ${result.id}
Our team will investigate shortly.
Ref: ${result.id}`

          // Clean up session
          delete sessionCache[sessionId]
        } else {
          response = `END Error submitting complaint. Please try again later.`
        }
      } catch (error) {
        console.error("Error submitting complaint:", error)
        response = `END Sorry, we could not process your report. Please try again later.`
      }
    } else {
      response = `CON Invalid selection. Please select severity:\n${formatSeverityList()}`
    }
  }

  // Default fallback
  else {
    response = `CON Invalid input. Please start over.
1. Report an issue
2. Register parcel`
  }

  return response
}

export async function ussdService(fastify: FastifyInstance) {
  // Register content-type parser for form-urlencoded (with secure regex)
  // Handles: application/x-www-form-urlencoded, application/x-www-form-urlencoded; charset=utf-8, etc.
  fastify.addContentTypeParser(
    /^application\/x-www-form-urlencoded/,
    async (request: any, payload: any) => {
      const chunks: Buffer[] = []
      for await (const chunk of payload) {
        chunks.push(chunk)
      }
      const data = Buffer.concat(chunks).toString("utf-8")
      const params = new URLSearchParams(data)
      return Object.fromEntries(params)
    }
  )

  /**
   * POST / (Root) - Catch-all for USSD gateways
   * Handles USSD requests sent to root path
   */
  fastify.post<{
    Body: {
      sessionId: string
      phoneNumber: string
      text: string
    }
  }>("/", async (request, reply) => {
    try {
      // Extract data from various sources (body, query, form data)
      const body = (request.body || {}) as Record<string, any>
      const query = (request.query || {}) as Record<string, any>

      // Try to get sessionId, phoneNumber, text from body, query, or form data
      const sessionId =
        body.sessionId ||
        body.session_id ||
        query.sessionId ||
        query.session_id ||
        "unknown"
      const phoneNumber =
        body.phoneNumber ||
        body.phone_number ||
        body.phone ||
        query.phoneNumber ||
        query.phone_number ||
        query.phone ||
        ""
      const text =
        body.text ||
        body.message ||
        body.input ||
        query.text ||
        query.message ||
        query.input ||
        ""

      if (!sessionId || !phoneNumber) {
        reply.header("Content-Type", "text/plain")
        return reply.send(
          `END Error: Missing required fields. Please provide sessionId and phoneNumber.`
        )
      }

      const prisma = fastify.prisma

      const response = await processUSSDRequest(
        sessionId,
        phoneNumber,
        String(text),
        prisma
      )

      reply.header("Content-Type", "text/plain")
      reply.send(response)
    } catch (error) {
      console.error("Root USSD Error:", error)
      reply.header("Content-Type", "text/plain")
      reply.send("END An error occurred. Please try again later.")
    }
  })

  /**
   * POST /ussd
   * Handle USSD interactions for reporting issues
   */
  fastify.post<{
    Body: any
  }>("/ussd", async (request, reply) => {
    try {
      // Extract data from various sources (body, query, form data)
      const body = (request.body || {}) as Record<string, any>
      const query = (request.query || {}) as Record<string, any>

      // Try to get sessionId, phoneNumber, text from body, query, or form data
      const sessionId =
        body.sessionId ||
        body.session_id ||
        query.sessionId ||
        query.session_id ||
        "unknown"
      const phoneNumber =
        body.phoneNumber ||
        body.phone_number ||
        body.phone ||
        query.phoneNumber ||
        query.phone_number ||
        query.phone ||
        ""
      const text =
        body.text ||
        body.message ||
        body.input ||
        query.text ||
        query.message ||
        query.input ||
        ""

      if (!sessionId || !phoneNumber) {
        reply.header("Content-Type", "text/plain")
        return reply.send(
          `END Error: Missing required fields. Please provide sessionId and phoneNumber.`
        )
      }

      const prisma = fastify.prisma

      const response = await processUSSDRequest(
        sessionId,
        phoneNumber,
        String(text),
        prisma
      )

      reply.header("Content-Type", "text/plain")
      reply.send(response)
    } catch (error) {
      console.error("USSD Error:", error)
      reply.header("Content-Type", "text/plain")
      reply.send("END An error occurred. Please try again later.")
    }
  })

  /**
   * GET /ussd/health
   * Health check for USSD service
   */
  fastify.get("/ussd/health", async (request, reply) => {
    return {
      status: "running",
      timestamp: new Date().toISOString(),
      service: "USSD Service",
    }
  })
}
