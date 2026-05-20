# Ledger Performance Report

Stand: 2026-05-20

## Kurzfazit

Die größten Performance-Bremsen waren nicht einzelne Micro-Optimierungen, sondern zu frühe und zu breite Arbeit:

- Der Chat hat vor jedem Stream RAG und Focus-OS-Kontext geladen.
- Die Chat-History-Liste hat ganze Conversations geladen, obwohl nur Metadaten angezeigt werden.
- Notes haben beim initialen Listenladen den kompletten Tiptap-JSON-Content jeder Note an den Client geschickt.
- Tiptap wurde auf Notes und Task-Details direkt in die Route-Chunks gezogen.
- Lint war durch generierte `.claude/**/.next`-Dateien praktisch unbrauchbar.

## Baseline

- `npm run build`: erfolgreich.
- Build-Zeit nach der ersten Fix-Runde: ca. 16.9s.
- `.next/static`: ca. 3.1 MB.
- `.next/server`: ca. 46 MB.
- Größte JS-Chunks nach Build: ca. 605 KB, 604 KB, 219 KB, 197 KB.
- CSS: ca. 154 KB globaler Hauptchunk plus kleinere Route-CSS-Chunks.

## Umgesetzte Fixes

### Chat

- `/api/chat` lädt Kontext jetzt on demand statt pauschal.
- Neuer Context-Modus in den Chat-Settings:
  - `Auto`: erkennt Quellen-/Focus-Fragen heuristisch.
  - `Fast`: kein RAG, kein Focus-Kontext.
  - `Sources`: nur RAG.
  - `Focus OS`: nur Focus-Kontext.
  - `Full`: RAG und Focus-Kontext.
- Chat-History im Prompt wird auf die letzten 16 vorherigen Messages begrenzt.
- RAG-Kontext wurde von 10.000 auf 6.000 Zeichen reduziert.
- RAG-/Chat-Debug-Logs sind jetzt hinter `CHAT_DEBUG=1`.
- Leere RAG-Events werden nicht mehr in den Stream geschrieben.
- Während Streaming wird die Assistant-Nachricht plain gerendert; Markdown/Citation-Parsing passiert erst nach dem Stream. Das reduziert Render-Arbeit pro Token deutlich.
- Supabase-Focus-Context nutzt spezifische Spalten statt `select("*")`.

### Chat-History Drawer

- Drawer lädt Chat-History nicht mehr beim Öffnen der Chat-Seite.
- Chat-History wird erst geladen, wenn der Drawer geöffnet wird.
- Liste lädt nur `id`, `name`, `personality`, `created_at` und maximal 50 Einträge.

### Notes

- Notes-Liste lädt nur Summary-Daten plus Preview.
- Voller Note-Content wird erst beim Öffnen einer Note geladen.
- Tiptap-Editor wird dynamisch geladen, statt Teil des initialen Notes-Bundles zu sein.
- Task-Detail-Editor lädt Tiptap ebenfalls dynamisch.

### Build/Lint Hygiene

- ESLint ignoriert jetzt `.claude/**` und `node_modules/**`, damit generierte Worktree-/Next-Dateien nicht mehr geprüft werden.
- Ein bestehender Hook-Order-Fehler im Dashboard wurde behoben.
- Todo-Page-Komponente wurde in `TodoPage` umbenannt und der zufällige Header wird ohne Effect initialisiert.

## Chat: Rack/RAG-Empfehlung

Ich würde das Rack-Konzept nicht als sichtbaren Standardpfad behalten. Für ein schnelles Premium-Gefühl sollte der Default-Chat immer "Fast by default, context when needed" sein.

Empfohlenes Zielmodell:

- Standard: sofortiger Chat ohne RAG/Focus-Waterfall.
- Quellen: bewusst aktivierbar oder automatisch nur bei klaren Dokument-/Quellenfragen.
- Focus OS: bewusst aktivierbar oder automatisch nur bei Task-/Tagesplan-Fragen.
- RAG-Sources im UI als Ergebnis anzeigen, aber nicht als Konzept, das der User verstehen muss.

Das fühlt sich schneller an und reduziert mentale Friction: Der User fragt einfach, das System entscheidet leise, ob Kontext nötig ist.

## Offene High-Impact-Punkte

1. Chat-Persistenz normalisieren.
   Aktuell wird pro Save weiterhin die gesamte Conversation in `chats.conversation` geschrieben. Besser wäre `chat_messages` append-only plus `chats` als Metadaten-Tabelle.

2. pgvector-RPC und Index verbindlich machen.
   Wenn die RPC fehlt, fällt RAG auf lokale Cosine-Rankings über viele Embeddings zurück. Das ist der größte RAG-Datenbank-Risiko-Pfad.

3. Focus-State nur einmal laden.
   Dashboard und NavBar laden teilweise denselben Focus-State. Ein kleiner Client-Store oder Server/API-Aggregat würde doppelte Supabase-Requests vermeiden.

4. Tiptap weiter isolieren.
   Der Editor ist jetzt lazy, aber die Tiptap-Komponenten selbst haben noch React-Compiler/Lint-Probleme und schwere UI-Primitives.

5. Notes-Autosave verbessern.
   Aktuell wird per `throttle` gespeichert. Besser: echtes Debounce, lokale Dirty-State-Anzeige, kein vollständiges Notes-List-Replace mit Editor-Content.

6. Route-/Bundle-Analyse automatisieren.
   Sinnvoll wäre ein kleines Script, das nach jedem Build die größten Chunks und Route-Assets in eine Tabelle schreibt.

## Verifikation

- `npm run build`: erfolgreich.
- `npm run lint`: läuft jetzt gegen die App-Dateien, scheitert aber noch an bestehenden React-Compiler/Lint-Themen in Focus-/Tiptap-Hooks und Primitives. Diese sind nicht Teil der ersten Performance-Fix-Runde und sollten separat aufgeräumt werden.

