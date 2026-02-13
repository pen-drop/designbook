# Blog Specification

## Overview
Die Blog-Detailseite präsentiert einzelne Fachartikel zu Drupal-Themen in einer festen, optimierten Struktur. Sie kombiniert hochwertigen Content mit gezielter Lead-Generierung durch einen prominenten CTA-Bereich und stellt den Autor als Experten dar, um Vertrauen und Kompetenz zu kommunizieren.

## User Flows
- Artikel lesen: Besucher landet auf der Detailseite → sieht Hero Image mit Titel → liest den Artikelinhalt (Body via Layout Builder) → sieht Autorenbox → wird durch CTA-Banner zur Kontaktaufnahme motiviert → sieht verwandte Artikel
- Lead-Conversion: Besucher scrollt durch den Artikel → erreicht den CTA-Bereich („Projekt besprechen" / „Beratung anfragen") → klickt den CTA → wird zur Kontaktseite weitergeleitet oder füllt ein Inline-Formular aus
- Weiterlesen: Besucher beendet den Artikel → sieht manuell kuratierte verwandte Artikel als Karten → klickt auf einen verwandten Artikel → navigiert zur nächsten Detailseite

## UI Requirements
- Hero-Bereich: Großes Hero Image (field_media) mit Artikel-Titel als Overlay, optional mit Preheadline (field_teaser_preheadline)
- Artikel-Body: Rich-Text-Inhalt via Layout Builder (layout_builder__layout) mit fester Struktur — unterstützt Text-Blöcke, Bilder, Zitate und Code-Beispiele
- Autorenbox: Kompakte Box unter dem Artikelinhalt mit Foto, Name, Rolle/Position bei keytec und optional E-Mail — nutzt contact_person Block-Typ
- CTA-Banner: Prominenter, visuell auffälliger Banner zwischen Artikelinhalt und verwandten Artikeln — mit Headline (z.B. „Sie benötigen Unterstützung?"), kurzem Text und einem CTA-Button zur Kontaktseite. Farblich abgesetzt (z.B. ocean oder swimsuit Background)
- Verwandte Artikel: 3 Teaser-Karten aus field_related — mit Hero Image, Preheadline, Titel und „Lesen"-Button. Überschrift: „Das könnte Sie auch interessieren"
- SEO: field_seo_title, field_og_image und field_meta_tag werden für Meta-Tags und Open Graph verwendet

## Configuration
- shell: true
