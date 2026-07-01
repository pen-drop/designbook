<?php

declare(strict_types=1);

namespace Drupal\designbook_config_schema\Commands;

use Drupal\Core\Config\TypedConfigManagerInterface;
use Drupal\config_inspector\ConfigInspectorManager;
use Drush\Commands\DrushCommands;
use Symfony\Component\Yaml\Yaml;

/**
 * Drush commands for designbook sync: schema emission + YAML validation.
 *
 * designbook:config-schema <config_name>
 *   Walks the typed-config definition tree for <config_name> and prints a
 *   minimal JSON Schema (type/properties/required/items) to stdout. Exit 0.
 *
 * designbook:config-validate <config_name> <yaml_path>
 *   Parses the YAML at <yaml_path> inside the container, runs it through
 *   Drupal's typed-config constraint system, and exits 0 (valid) or 1 (with
 *   violation detail on stderr).
 */
class ConfigSchemaCommands extends DrushCommands {

  /**
   * Typed configuration manager.
   */
  protected TypedConfigManagerInterface $typedConfig;

  /**
   * Constructs ConfigSchemaCommands.
   *
   * @param \Drupal\Core\Config\TypedConfigManagerInterface $typed_config
   *   The typed config manager.
   */
  public function __construct(TypedConfigManagerInterface $typed_config) {
    parent::__construct();
    $this->typedConfig = $typed_config;
  }

  // ---------------------------------------------------------------------------
  // Scalar type map — typed-config type string → JSON Schema primitive type.
  // Covers all built-in core types found in config schemas.
  // ---------------------------------------------------------------------------

  /**
   * Maps a typed-config scalar type string to a JSON Schema primitive.
   *
   * Returns NULL when the type is not a known scalar (i.e. it is a mapping or
   * sequence and the caller must walk the definition tree further).
   *
   * @param string $type
   *   Typed-config type string, e.g. "boolean", "label", "uuid".
   *
   * @return string|null
   *   JSON Schema primitive ("string", "boolean", "integer", "number") or NULL.
   */
  private function scalarToJsonSchemaType(string $type): ?string {
    $map = [
      'string'           => 'string',
      'text'             => 'string',
      'label'            => 'string',
      'required_label'   => 'string',
      'uri'              => 'string',
      'uuid'             => 'string',
      'email'            => 'string',
      'langcode'         => 'string',
      'machine_name'     => 'string',
      'color_hex'        => 'string',
      'path'             => 'string',
      'boolean'          => 'boolean',
      'integer'          => 'integer',
      'float'            => 'number',
      'weight'           => 'integer',
    ];
    return $map[$type] ?? NULL;
  }

  // ---------------------------------------------------------------------------
  // Walker — typed-config definition → JSON Schema fragment.
  // Mirrors the proven drush php:eval walker from the Task-1 spike (task-1-report.md).
  // ---------------------------------------------------------------------------

  /**
   * Recursively walks a typed-config definition and returns a JSON Schema array.
   *
   * @param array $definition
   *   A typed-config definition as returned by TypedConfigManager::getDefinition().
   * @param \Drupal\Core\Config\TypedConfigManagerInterface $tcm
   *   The typed config manager (used to resolve type aliases at depth).
   * @param int $depth
   *   Current recursion depth. Hard-stopped at 4 to avoid infinite loops on
   *   self-referential types (e.g. views display_options). At depth ≥ 4 the
   *   property degrades to {type: string}.
   *
   * @return array
   *   JSON Schema fragment (associative array; json_encode-ready).
   */
  private function walkDefinition(array $definition, TypedConfigManagerInterface $tcm, int $depth = 0): array {
    if ($depth > 4) {
      return ['type' => 'string'];
    }

    $type  = $definition['type']  ?? '';
    $class = $definition['class'] ?? '';

    // --- Mapping (object) ---------------------------------------------------
    if (isset($definition['mapping']) || str_contains($class, 'Mapping')) {
      $schema = [
        'type'       => 'object',
        'properties' => [],
        'required'   => [],
      ];

      foreach (($definition['mapping'] ?? []) as $key => $propDef) {
        // Attempt to resolve a type alias so we get the full mapping/sequence
        // tree for named types (e.g. "config_dependencies", "langcode").
        $resolved = $propDef;
        if (
          !isset($propDef['mapping']) &&
          !isset($propDef['sequence']) &&
          isset($propDef['type'])
        ) {
          try {
            $resolved = $tcm->getDefinition($propDef['type']);
          }
          catch (\Exception) {
            // Unknown type alias — keep the raw propDef; scalar fallback applies.
          }
        }

        $schema['properties'][$key] = $this->walkDefinition($resolved, $tcm, $depth + 1);

        // A property is required unless explicitly marked optional.
        if (!isset($propDef['requiredKey']) || $propDef['requiredKey'] !== FALSE) {
          $schema['required'][] = $key;
        }
      }

      if (empty($schema['required'])) {
        unset($schema['required']);
      }

      if (empty($schema['properties'])) {
        unset($schema['properties']);
      }

      return $schema;
    }

    // --- Sequence (array) ---------------------------------------------------
    if (isset($definition['sequence']) || str_contains($class, 'Sequence')) {
      $schema = ['type' => 'array'];
      if (isset($definition['sequence'])) {
        $schema['items'] = $this->walkDefinition($definition['sequence'], $tcm, $depth + 1);
      }
      return $schema;
    }

    // --- Scalar -------------------------------------------------------------
    $primitive = $this->scalarToJsonSchemaType($type);
    if ($primitive !== NULL) {
      return ['type' => $primitive];
    }

    // Fallback: unknown or compound type string (e.g. "condition.plugin").
    // Try resolving the type alias one level; degrade to "string" on failure.
    if ($type !== '' && $depth < 4) {
      try {
        $resolved = $tcm->getDefinition($type);
        return $this->walkDefinition($resolved, $tcm, $depth + 1);
      }
      catch (\Exception) {
        // Cannot resolve — fall through.
      }
    }

    return ['type' => 'string'];
  }

  // ---------------------------------------------------------------------------
  // Drush commands
  // ---------------------------------------------------------------------------

  /**
   * Emits the JSON Schema for a Drupal config name on stdout.
   *
   * @param string $config_name
   *   The Drupal config object name, e.g. "node.type.article".
   *
   * @usage drush designbook:config-schema node.type.article
   *   Print the JSON Schema for node.type.article.
   *
   * @command designbook:config-schema
   * @aliases dcs
   */
  public function configSchema(string $config_name): void {
    $definition = $this->typedConfig->getDefinition($config_name);
    $schema     = $this->walkDefinition($definition, $this->typedConfig);
    // Write directly to stdout — Drush formatters are not involved.
    fwrite(STDOUT, json_encode($schema, JSON_THROW_ON_ERROR) . PHP_EOL);
  }

  /**
   * Validates a YAML file against a Drupal config schema.
   *
   * Exits 0 when the YAML conforms; exits 1 and writes violation detail to
   * stderr when violations are found.
   *
   * @param string $config_name
   *   The Drupal config object name, e.g. "node.type.article".
   * @param string $yaml_path
   *   Absolute path (inside the container) to the YAML file to validate.
   *
   * @usage drush designbook:config-validate node.type.article /tmp/test.yml
   *   Validate /tmp/test.yml against the node.type.article schema.
   *
   * @command designbook:config-validate
   * @aliases dcv
   */
  public function configValidate(string $config_name, string $yaml_path): void {
    if (!file_exists($yaml_path)) {
      fwrite(STDERR, "File not found: $yaml_path" . PHP_EOL);
      exit(1);
    }

    $data = Yaml::parse(file_get_contents($yaml_path));

    $definition  = $this->typedConfig->getDefinition($config_name);
    $dataDefinition = $this->typedConfig->buildDataDefinition($definition, $data);
    $typedData   = $this->typedConfig->create($dataDefinition, $data, $config_name);
    $violations  = $typedData->validate();

    if (count($violations) === 0) {
      // Valid — exit 0 (Drush default).
      return;
    }

    // Write human-readable violations JSON to stderr and exit non-zero.
    $detail = ConfigInspectorManager::violationsToArray($violations);
    fwrite(STDERR, json_encode($detail, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . PHP_EOL);
    exit(1);
  }

}
