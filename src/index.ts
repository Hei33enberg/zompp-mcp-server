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

// Tool: Search Legal Precedents (Wyroki, SN, TSUE)
server.tool(
  "search_legal_precedents",
  "Search ZomPP's database of legal precedents, Supreme Court (SN) and CJEU (TSUE) rulings. Supports full-text search.",
  {
    query: z.string().describe("Search query (e.g. 'oszustwo komputerowe', 'art 286 kk')"),
    court: z.string().optional().describe("Filter by court type, e.g. 'SN', 'TSUE'"),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results")
  },
  async ({ query, court, limit }) => {
    // Perform Full-Text Search on public.legal_documents
    let supabaseQuery = supabase
      .from("legal_documents")
      .select("id, title, court, signature, judgment_date, summary, slug");
      
    // Text search against the fts vector index
    supabaseQuery = supabaseQuery.textSearch(
      "fts",
      query,
      { config: 'polish' }
    );

    if (court) {
      supabaseQuery = supabaseQuery.eq("court", court);
    }

    const { data, error } = await supabaseQuery.limit(limit);
    
    // Fallback to basic ILIKE search if textSearch throws or is empty
    if (error || !data || data.length === 0) {
      let fallbackQuery = supabase
        .from("legal_documents")
        .select("id, title, court, signature, judgment_date, summary, slug");
      
      if (court) fallbackQuery = fallbackQuery.eq("court", court);
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery
        .or(`title.ilike.%${query}%,signature.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(limit);
        
      if (fallbackError) {
        return { content: [{ type: "text", text: `Error: ${fallbackError.message}` }], isError: true };
      }
      return { content: [{ type: "text", text: JSON.stringify(fallbackData, null, 2) }] };
    }

    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Get Legal Precedent Detail
server.tool(
  "get_legal_precedent",
  "Fetch the complete text and metadata of a legal ruling by its signature or slug.",
  {
    signature: z.string().optional().describe("Signature of the ruling, e.g. 'II CSK 123/24'"),
    slug: z.string().optional().describe("SEO slug of the ruling")
  },
  async ({ signature, slug }) => {
    if (!signature && !slug) {
      return { content: [{ type: "text", text: "You must provide either a signature or a slug" }], isError: true };
    }

    let query = supabase.from("legal_documents").select("*");
    if (slug) {
      query = query.eq("slug", slug);
    } else {
      query = query.eq("signature", signature);
    }

    const { data, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Precedent not found" }], isError: true };

    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
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
