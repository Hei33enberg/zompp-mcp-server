<div align="center">
  <h1>🚀 ZomPP MCP Server</h1>
  <p><strong>Oficjalny serwer Model Context Protocol (MCP) dla platformy ZomPP.pl</strong></p>
</div>

---

## 📖 O projekcie

**ZomPP MCP Server** to potężny, niezależny interfejs API zbudowany w oparciu o architekturę **Model Context Protocol**. Umożliwia on zewnętrznym agentom sztucznej inteligencji (np. Claude 3.5 Sonnet w aplikacji Claude Desktop, narzędziom orkiestracyjnym) na bezpośrednią, bezpieczną komunikację z silnikiem prawnym ZomPP.

Dzięki temu serwerowi, Twój lokalny lub chmurowy Agent AI zyskuje pełny wgląd w ekosystem ZomPP – od zarządzania wygenerowanymi zawiadomieniami po głęboką diagnostykę procesu twórczego (Chyłka-Pattern).

## 🛠️ Dostępne Narzędzia (Tool Catalog)

Serwer wystawia następujące narzędzia (Tools) gotowe do użycia przez LLM:

* 📋 **`list_reports`** — Pobiera stronicowaną listę zawiadomień ZomPP z bazy Supabase. Pozwala na zaawansowane filtrowanie po statusach (np. `paid`, `draft`).
* 🔍 **`get_report`** — Zwraca pełny, surowy zrzut danych JSON konkretnego raportu na podstawie jego UUID.
* 🧠 **`diagnose_orchestration`** — Zaawansowane narzędzie diagnostyczne. Agent analizuje wygenerowane sekcje prawne (output silnika Chyłki), wykrywa zablokowane pętle, zlicza sekcje i diagnozuje błędy mechanizmów *Fallback*.

## 💻 Uruchomienie lokalne (Claude Desktop)

Aby podpiąć ZomPP bezpośrednio pod Twojego lokalnego asystenta Claude Desktop, nie potrzebujesz Dockera. Wystarczy uruchomić serwer w locie przez `ts-node`.

1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/Hei33enberg/zompp-mcp-server.git
   cd zompp-mcp-server
   npm install
   ```

2. Dodaj poniższą konfigurację do pliku `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "zompp-mcp": {
         "command": "npx",
         "args": ["ts-node", "/BEZWZGLEDNA/SCIEZKA/DO/zompp-mcp-server/src/index.ts"],
         "env": {
           "SUPABASE_URL": "https://jbgfptzpnhedukqfudkr.supabase.co",
           "SUPABASE_ANON_KEY": "TWÓJ_KLUCZ_ANON_KEY",
           "SUPABASE_SERVICE_ROLE": "TWÓJ_KLUCZ_SERVICE_ROLE"
         }
       }
     }
   }
   ```

## ☁️ Wdrożenie Produkcyjne (Hetzner VPS)

Serwer jest w 100% gotowy na wdrożenie kontenerowe (Docker) na maszynach typu VPS (np. Hetzner Cloud), co pozwala wpiąć go w globalną sieć agentów (np. platformy *White Intel* czy *Marocain*).

1. Zaloguj się na swojego VPS-a i sklonuj to repozytorium.
2. Utwórz plik `.env` i wklej swoje klucze Supabase.
3. Odpal środowisko jedną komendą:
   ```bash
   docker-compose up -d --build
   ```

System automatycznie zbuduje lekki obraz oparty na `node:20-alpine` i uruchomi serwer MCP w tle.

---
<div align="center">
  <i>Zbudowane z pasją dla ZomPP. Wszelkie prawa zastrzeżone.</i>
</div>
