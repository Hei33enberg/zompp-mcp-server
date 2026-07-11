import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jbgfptzpnhedukqfudkr.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_ANON_KEY in environment variables.");
  process.exit(1);
}

// Create a Supabase client. If SERVICE_ROLE is provided, use it for admin access.
// Otherwise fallback to ANON_KEY.
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY
);

const server = new McpServer({
  name: "zompp-mcp-server",
  version: "1.0.0",
  description: "Official MCP Server for ZomPP. Enables AI agents to interact with the ZomPP legal reporting platform."
});

// Tool: List Reports
server.tool(
  "list_reports",
  "List ZomPP reports (zawiadomienia). Use limit to paginate.",
  {
    limit: z.number().int().min(1).max(50).default(20).describe("Max rows"),
    status: z.string().optional().describe("Filter by status (e.g. 'paid', 'draft')")
  },
  async ({ limit, status }) => {
    let query = supabase.from("reports").select("id, report_type, status, created_at").order("created_at", { ascending: false }).limit(limit);
    if (status) query = query.eq("status", status);
    
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Get Report Details
server.tool(
  "get_report",
  "Fetch full details of a ZomPP report by its ID.",
  {
    id: z.string().uuid().describe("Report UUID")
  },
  async ({ id }) => {
    const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Report not found" }], isError: true };
    
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Diagnose Orchestration
server.tool(
  "diagnose_orchestration",
  "Analyzes generated sections of a report to diagnose Chyłka AI progress or find AI fallback errors.",
  {
    id: z.string().uuid().describe("Report UUID to diagnose")
  },
  async ({ id }) => {
    const { data, error } = await supabase.from("reports").select("id, status, payment_status, document_content, created_at").eq("id", id).single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    
    const content = data.document_content || "";
    const sections = content.split("##").filter(Boolean);
    const diagnosticInfo = {
      report_id: data.id,
      status: data.status,
      payment_status: data.payment_status,
      total_length: content.length,
      sections_generated: sections.length,
      is_fallback_visible: content.includes("BŁĄD GENERATORA")
    };
    
    return { content: [{ type: "text", text: `Diagnostic Report:\n${JSON.stringify(diagnosticInfo, null, 2)}\n\nPreview of last section:\n${content.substring(content.length - 200)}` }] };
  }
);

// Initialize Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ZomPP MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
