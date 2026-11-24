# Drupal/Vue: Ökosystem-Prüfung

Stand: 19. September 2026. Primärquellen wurden online geprüft, einschließlich Git-Manifeste und npm-Registry. Dies ist eine Quellenprüfung; keine der Kombinationen wurde hier installiert oder gegen Drupal ausgeführt.

**Ergebnis:** Für Designbooks Vue-Unterstützung sind Lupus und Druxt keine Voraussetzung. Vue-Komponenten und deren Storybook-Build können unabhängig vom späteren Drupal-Datenzugriff entstehen. Lupus ist ein geeigneter nachgelagerter Kandidat für eine Nuxt/Drupal-Anwendung; Druxt liefert interessante Konzepte, setzt im geprüften Stand aber auf Vue 2/Nuxt 2.

## Was genau ist Lupus?

| Baustein | Aufgabe | Geprüfter Stand |
| --- | --- | --- |
| `drupal/lupus_decoupled_starter` | Drupal-CMS-2-Site-Template als Drupal-Recipe mit Canvas-Anbindung | Release `2.2.0`, 19.06.2026; Composer verlangt u. a. `canvas_extjs ^1.2`, `lupus_decoupled ^1.5`, `custom_elements ^3.4.1` |
| `drunomics/lupus-decoupled-nuxt-starter` | Separates Nuxt-Frontend mit Vue-Komponenten | `main`: Nuxt `^4.4.2`, Connector `^2.6.1`, Preview `^1.0.0-rc.2` |
| `nuxtjs-drupal-ce` | Nuxt-Modul für Drupal-Seiten, Routing und Custom-Elements-Daten | npm `latest` ist `2.9.0`, veröffentlicht 20.08.2026; Modul deklariert Nuxt `>=3.7.0`, Entwicklungsmanifest nutzt Nuxt `^4.5.2` und Vue `^3.5.41` |

Quellen: [Drupal-Projekt](https://www.drupal.org/project/lupus_decoupled_starter), [Recipe-Manifest 2.2.0](https://git.drupalcode.org/project/lupus_decoupled_starter/-/blob/2.2.0/composer.json), [Frontend-Manifest, Commit cf4d5ef](https://github.com/drunomics/lupus-decoupled-nuxt-starter/blob/cf4d5ef14e4778a0bcb7df641d0b0b4eebb666ee/package.json), [Connector-Manifest, Commit bf7cca4](https://github.com/drunomics/nuxtjs-drupal-ce/blob/bf7cca4e4cc7a7a901fc9c4830394201ea50182f/package.json), [Modul-Kompatibilität](https://github.com/drunomics/nuxtjs-drupal-ce/blob/bf7cca4e4cc7a7a901fc9c4830394201ea50182f/src/module.ts), [npm-Metadaten](https://registry.npmjs.org/nuxtjs-drupal-ce).

Das Drupal-Recipe und das Nuxt-Repository sind unterschiedliche Teile desselben Setups. Ältere Texte und das Connector-README sprechen noch von Nuxt 3; daraus sollte keine aktuelle Nuxt-3-Beschränkung abgeleitet werden. Die neueren Manifeste zeigen Nuxt 4. Versionsbereiche und Entwicklungsabhängigkeiten sind allerdings kein eigener Integrationstest.

Der Connector verarbeitet ein Komponentenformat mit `element`, `props` und `slots`, ordnet Namen global registrierten Vue-Komponenten zu und bietet bereits Drupal-Routing, Metadaten, Cookies und Form-Weiterleitung. Das ist ein Vertrag für die spätere Anwendung, kein erforderliches Designbook-Szenenformat. [Connector-Dokumentation](https://github.com/drunomics/nuxtjs-drupal-ce/blob/bf7cca4e4cc7a7a901fc9c4830394201ea50182f/README.md).

Für eine spätere Canvas-Anbindung ist `nuxt-component-preview` relevant: Es erzeugt aus TypeScript/JSDoc-Metadaten globaler Vue-Komponenten einen `component-index.json` und unterstützt externe Vorschauen mit `canvas_extjs`. Eine eigene parallele Metadaten-Pipeline sollte erst nach Prüfung dieses vorhandenen Bausteins erwogen werden. Das ist eine Empfehlung, keine bereits verifizierte Designbook-Integration. [Preview-Dokumentation, Commit 257c630](https://github.com/drunomics/nuxt-component-preview/blob/257c630472c934e8839b5f773f66660ad9407712/README.md).

## Druxt: gepflegte Quellen, älterer Framework-Stack

Druxt verwendet Drupal JSON:API und Display-Konfigurationen für Entity-, Field-, Block-, Views- und Slot-Komponenten. Das aktuelle README beschreibt ausdrücklich eine Nuxt-2-Anwendung. Das geprüfte Beispiel enthält Nuxt `2.15.8` und `@nuxtjs/storybook 4.3.2`; das zentrale Manifest enthält Vue `2.7.16`. [README](https://github.com/druxt/druxt.js/blob/8f5d9346a2a9f625580bff5b0d7051c3e40c34e9/README.md), [Beispielmanifest](https://github.com/druxt/druxt.js/blob/8f5d9346a2a9f625580bff5b0d7051c3e40c34e9/examples/druxt-site/package.json), [Root-Manifest](https://github.com/druxt/druxt.js/blob/8f5d9346a2a9f625580bff5b0d7051c3e40c34e9/package.json).

**Nicht als aufgegeben einstufen:** Das Repository ist nicht archiviert und enthält neue Arbeit vom 19.09.2026. Gleichzeitig ist npm `druxt@latest` weiterhin `0.24.0` vom 02.11.2023. Git-Aktivität und veröffentlichte Version müssen getrennt bewertet werden. Ein veröffentlichter Vue-3/Nuxt-4-Pfad wurde in den geprüften Quellen nicht belegt. Für neue Vue-3-Komponenten empfiehlt sich deshalb keine Druxt-Abhängigkeit. [Repository-Metadaten](https://api.github.com/repos/druxt/druxt.js), [konkreter neuer Commit](https://github.com/druxt/druxt.js/commit/8f5d9346a2a9f625580bff5b0d7051c3e40c34e9), [npm-Metadaten](https://registry.npmjs.org/druxt).

## Storybook: Vue zuerst, Nuxt nur bei echtem Bedarf

Für isolierte Vue-SFCs existiert `@storybook/vue3-vite`: offizielle Vue-3/Vite-Unterstützung einschließlich Props-, Events- und Slot-Metadaten. npm `latest` ist `10.6.0`; dessen Storybook-Peer ist `^10.6.0`. Der tatsächliche Spike muss zur bestehenden Designbook-Storybook-Version passende Versionen pinnen. [Offizielle Framework-Dokumentation](https://storybook.js.org/docs/get-started/frameworks/vue3-vite), [Paketmanifest 10.6.0](https://registry.npmjs.org/@storybook/vue3-vite/10.6.0).

Bei Nuxt-Storybook gibt es einen wichtigen Unterschied zwischen Repository und veröffentlichtem Paket:

| Quelle | Belegter Vertrag |
| --- | --- |
| `nuxt-modules/storybook` auf `main` | `@storybook-vue/nuxt` verlangt Nuxt `^3.18.1 \|\| ^4.0.0`, Storybook `^10.6.0`, Node `>=22.0.0` |
| npm `@storybook-vue/nuxt@9.0.1` (`latest`) | Nuxt `^3.13.0`, Storybook `~9.0.5`, Vue `^3.4.0`, Node `>=20.0.0` |
| npm `@nuxtjs/storybook@9.0.1` (`latest`) | Storybook `~9.0.5`, Node `>=20.0.0` |

Quellen: [Repository-Manifest, Commit 2df8f6b](https://github.com/nuxt-modules/storybook/blob/2df8f6b6d387f234050af8ff7f24df05f9380d33/packages/storybook-addon/package.json), [veröffentlichtes Framework](https://registry.npmjs.org/@storybook-vue/nuxt/9.0.1), [veröffentlichtes Nuxt-Modul](https://registry.npmjs.org/@nuxtjs/storybook/9.0.1).

Damit belegt ein aktuelles GitHub-README noch keine per `latest` installierbare Nuxt-4/Storybook-10-Kombination. Reine Vue-Komponenten benötigen diesen Nuxt-Adapter nicht. Sobald Komponenten Nuxt-Composables, Auto-Imports oder Nuxt-Routing voraussetzen, braucht der Test entweder den passenden Nuxt-Kontext oder bewusst definierte Test-Ersatzimplementierungen. Die Kompatibilität des Designbook-Addons mit dem Vue-Renderer bleibt separat praktisch zu prüfen.

## Konsequenz für den Spike

Die erste Machbarkeitsfrage lautet: dieselbe Designbook-Arbeit mit Vue-Komponenten und passendem Build ausführen. Ein Drupal-Server, Lupus, Canvas oder Druxt ist dafür kein notwendiger erster Schritt. Erst beim Einsatz dieser Komponenten in einer Drupal-Anwendung wird die Daten- und Laufzeitintegration gewählt. Dafür ist Lupus/Nuxt 4 anhand der geprüften Quellen der passendere Kandidat; Laufzeit, Vorschau und Deployment sind noch ungetestet.
