import { adminAgent } from "@/lib/admin-agent";
import { createAgentUIStreamResponse } from "ai";
import { createOrGetSandbox } from "@/lib/sandbox";

export const POST = async (req: Request) => {
  const { messages } = await req.json();

  const sandbox = await createOrGetSandbox("admin-agent-sandbox"); 

  return createAgentUIStreamResponse({
    agent: adminAgent,
    uiMessages: messages,
    options: { sandbox }, 
  });
};
