## 1. Runtime: Types und Builder entfernen

- [x] 1.1 `types.ts`: `ListConfig` Interface und `ConfigSceneNode` Interface entfernen; `DataModel.config` Property entfernen
- [x] 1.2 `builders/config-list-builder.ts` löschen
- [x] 1.3 `renderer/__tests__/config-list-builder.test.ts` löschen
- [x] 1.4 `scene-module-builder.ts`: Import von `configListBuilder` entfernen; `registry.register(configListBuilder)` entfernen
- [x] 1.5 `renderer/index.ts`: Re-Export von `configListBuilder` entfernen

## 2. Entity-Builder: leere Input-Fallback

- [x] 2.1 `entity-builder.ts`: Wenn kein Record in `data.yml` gefunden → `{}` als Input übergeben statt Fehler/Placeholder
- [x] 2.2 Test: entity-builder mit `entity: view.recent_articles` (kein data.yml Eintrag) → lädt JSONata, evaluiert mit `{}`

## 3. Schema: config-Sektion entfernen

- [x] 3.1 `data-model.schema.yml`: `config` property aus root-Object entfernen
- [x] 3.2 `data-model.schema.yml`: `list` und `list_source` aus `definitions` entfernen

## 4. Test-Fixtures migrieren

- [x] 4.1 `fixtures/view-modes/list.recent_articles.default.jsonata` → umbenennen zu `view.recent_articles.default.jsonata`; Inhalt auf inline entity refs umschreiben (kein `$rows`)
- [x] 4.2 `fixtures/view-modes/list.mixed_content.default.jsonata` → umbenennen zu `view.mixed_content.default.jsonata`; Inhalt anpassen
- [x] 4.3 `fixtures/data-model.yml`: `config:` Sektion entfernen
- [x] 4.4 `fixtures/test.scenes.yml`: `config: list.recent_articles` → `entity: view.recent_articles`

## 5. Skill: designbook-scenes aktualisieren

- [x] 5.1 `resources/config-list.md` löschen (gerade in scenes-listing-config-list erstellt — wird obsolet)
- [x] 5.2 `resources/view-entity.md` erstellen: Konvention für view entities, JSONata-Format mit inline entity refs, kein data.yml nötig
- [x] 5.3 `resources/entry-types.md`: `Config Entry` Abschnitt ersetzen durch `View Entity` mit `entity: view.<name>` Syntax
- [x] 5.4 `tasks/create-scene.md`: Listing-Beispiel von `config: list.*` auf `entity: view.*` aktualisieren; Listing-Template anpassen
- [x] 5.5 `SKILL.md`: Resources-Sektion aktualisieren (`config-list.md` → `view-entity.md`)

## 6. Skill: designbook-data-model aktualisieren

- [x] 6.1 `tasks/create-data-model.md`: `config:` Sektion aus Format-Beispiel und Dokumentation entfernen
