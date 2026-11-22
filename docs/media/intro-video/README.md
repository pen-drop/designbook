# Intro-Video: Rezept-Animatic

> Superseded by [`website/scripts/demo/`](../../../website/scripts/demo/README.md) — the 60-second explainer (DESIGNBOOK-81).

[20-Sekunden-Animatic ansehen](index.html) · [MP4](recipe/intro.mp4) ·
[Schnittvorlage und genaue Zuordnungen](STORYTELLING.md)

Diese Fassung prüft die bestätigte Geschichte: Figma → Claude-Aufträge → Datenmodell
und Tokens → Scene → Entities → Komponenten. Zwei Scrollfahrten und synchrone
Sidebar-Einträge zeigen, wie aus dem Design ein System entsteht.

**Noch unvollständig:** Der echte Figma-Editor konnte wegen HTTP 403 nicht
aufgenommen werden. Der Einstieg ist ausdrücklich als Platzhalter markiert.
Claude ist ein gekennzeichnetes Replay wörtlicher Prompt-Auszüge, keine Aufnahme
eines neuen Live-Laufs. Lichtimpulse sind noch nicht final gestaltet.

## Wiederherstellen

Vorhandene Aufnahmen brauchen kein laufendes Storybook:

```bash
node docs/media/intro-video/recipe/render.mjs
pnpm --dir packages/integrations/test-integration-drupal exec vite "$PWD/docs/media/intro-video" --host 127.0.0.1 --port 4187 --strictPort
```

Vom Repository-Root ausführen, danach `http://localhost:4187/` öffnen. Vite unterstützt
Byte-Range-Anfragen, damit die Sprünge zu Schlüsselbildern zuverlässig funktionieren.
Bei einem Tunnel dessen Host über `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` freigeben. Der Renderer benötigt die installierten
Repository-/Integration-Abhängigkeiten, Playwright Chromium und `ffmpeg`.
Er prüft die neun synchronen Zuordnungen samt sichtbaren Ausschnitten und hält
die letzte Sekunde statisch: 600 Frames, 20 Sekunden, 1280 × 720, 30 fps, stumm.

Neue Storybook-Aufnahmen vom fertigen Rezept-Workspace:

```bash
STORYBOOK_URL=http://localhost:34211 node docs/media/intro-video/recipe/capture.mjs
STORYBOOK_URL=http://localhost:34211 node docs/media/intro-video/recipe/capture-animatic.mjs
```

`capture.mjs` benötigt außerdem die ursprünglichen gitignored Claude-Reports;
der zweite Aufruf nimmt die vollständige Rezeptseite, Storybook-Chrome und echte
Sidebar-Zeilen auf und misst die Zielbereiche für `pairs.json`.

Eine echte Figma-Editor-Aufnahme wird unverzerrt als `recipe/screenshots/figma-editor.png`
abgelegt. Anschließend setzt `recipe/figma.json` den `path` auf
`screenshots/figma-editor.png` und dokumentiert die Quelle. Der Film lädt das Bild
anstelle des Platzhalters. Aufnahme vorher auf sichtbare private Inhalte prüfen.

Die Landingpage behält ihre bisherige Einbindung. Frühere Pricing-Entwürfe:
[Astra](astra/intro.mp4) · [Opus](opus/intro.mp4). Die verworfene 15-Sekunden-Rezeptfassung
bleibt über die Git-Historie nachvollziehbar; die aktuelle Vorschau zeigt das Animatic.
