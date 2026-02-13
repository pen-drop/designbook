# Screen Designs

### BlogDetail
Die Artikel-Detailseite zeigt einen einzelnen Blog-Artikel in einer festen, optimierten Struktur. Das Layout ist eingespaltig und zentriert (max-width ~800px für optimale Lesbarkeit), mit voller Breite für den Hero-Bereich.

**Seitenaufbau (Top → Bottom):**
1. **Hero-Bereich** — Full-width Hero Image aus field_media mit darüber liegendem Artikel-Titel (h1) und optionaler Preheadline (field_teaser_preheadline). Dunkles Overlay für Textlesbarkeit.
2. **Artikel-Body** — Rich-Text-Inhalt via Layout Builder (layout_builder__layout), zentriert mit guter Typografie. Unterstützt Text-Blöcke, Bilder, Zitate und Code-Beispiele.
3. **Autorenbox** — Horizontale Karte mit Foto links, Name, Rolle/Position bei keytec und E-Mail rechts. Nutzt contact_person Block-Typ. Dezenter Hintergrund (shell).
4. **CTA-Banner** — Volle Breite, farblich abgesetzter Hintergrund (ocean), weiße Schrift. Headline (z.B. „Sie benötigen Unterstützung?"), kurzer Text und prominenter CTA-Button (swimsuit) zur Kontaktseite.
5. **Verwandte Artikel** — Überschrift „Das könnte Sie auch interessieren", darunter 3 Teaser-Karten aus field_related in einem 3-Spalten-Grid. Jede Karte zeigt Hero Image, Preheadline, Titel und „Lesen"-Button.

**Daten:** article Node (title, field_media, field_teaser_preheadline, body/layout_builder__layout, field_related), contact_person Block (field_name, field_title, field_email, field_media)

**Mobile:** Hero Image volle Breite mit Titel darunter statt Overlay. Autorenbox wird zur vertikalen Karte (Foto oben, Text unten). CTA-Banner bleibt volle Breite. Related-Karten werden im Einspalt-Stack dargestellt.
