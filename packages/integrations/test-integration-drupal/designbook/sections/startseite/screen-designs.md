# Screen Designs

### Landing

Die Startseite ist eine vollständige Landing Page mit vertikal gestapelten Sektionen. Jede Sektion wird in einem `layout`-Container (`container-md`) mit eigenem Spacing (`pt-auto`, `pb-auto`) gerendert. Die Seite ist in die Application Shell eingebettet (Header oben, Footer unten).

**Hero-Sektion:** Zweispaltiges Layout (`layout` mit `grid-2`). Linke Spalte: großformatiges Bild (field_media der landing_page). Rechte Spalte: Headline "Mit Drupal auf Zielkurs." (h1), Subline "Seit mehr als 15 Jahren zählen wir zu den führenden Drupal-Agenturen in Deutschland.", zwei CTA-Buttons nebeneinander — "Leistungen" (outline/ghost) und "Kontakt" (primary). Auf Mobile wird das Bild über die Headline gestapelt (`grid-1`).

**Leistungen-Teaser:** Dreispaltiges Grid (`layout` mit `grid-3`, Header aktiviert). Header-Text: "Leistungen als Drupal Agentur" mit Subline "Unsere Expertise für Ihren Erfolg." Drei Card-Komponenten (block_content.card) mit jeweils Icon (field_dingbats), Headline (field_headline), Beschreibungstext (field_text) und "Mehr erfahren"-Link (field_link). Cards nutzen die Dingbat-Icons j (Beratung), F (Design), l (Entwicklung). Auf Tablet `grid-2`, auf Mobile `grid-1`.

**Projekte-Teaser:** Dreispaltiges Grid (`layout` mit `grid-3`, Header aktiviert). Header-Text: "Unsere Drupal-Projekte". Drei Projekt-Cards (node.projects) mit Hero-Bild (field_media), Preheadline "Projekt" (field_teaser_preheadline), Titel (title), Teaser-Beschreibung (field_teaser_description) und CTA-Button (field_button_text). Auf Tablet `grid-2`, auf Mobile `grid-1`.

**Kundenzitat:** Einspaltiges Layout (`layout` mit `grid-1`), zentriert. Quote-Komponente (block_content.quote) mit Zitat-Text (field_quote), Autor (field_author) und Kundenlogo (field_media). Visuell abgesetzt durch Hintergrundfarbe oder größeren Abstand.

**Blog-Teaser:** Dreispaltiges Grid (`layout` mit `grid-3`, Header aktiviert). Header-Text: "Aus unserem Blog". Drei Artikel-Cards (node.article) mit Hero-Bild (field_media), Preheadline (field_teaser_preheadline), Titel (title), Teaser-Beschreibung (field_teaser_description) und "Lesen"-Button (field_button_text). Auf Tablet `grid-2`, auf Mobile `grid-1`.

**Kontaktbereich:** Zweispaltiges Layout (`layout` mit `grid-2`). Linke Spalte: Headline "Sie suchen eine Drupal Agentur für die Entwicklung nachhaltiger digitaler Projekte?", CTA-Button "Jetzt anfragen" (primary). Rechte Spalte: Contact-Box-Komponente (block_content.contact_box) mit Foto (field_contact_image), Name (field_first_name + field_last_name), Position (field_position), E-Mail (field_email) und Telefon (field_phone). Auf Mobile wird der Text über die Contact-Box gestapelt (`grid-1`).
