import { createAIRouteHandler } from "ai-router/next"

const handler = createAIRouteHandler({ projectName: "blochub" })

export const POST = handler.POST
export const GET = handler.GET
