# CSS:
Make it more concrete: How should groups/css groups generated
- generate-jsonata.md


Make it more generic: generate-index

result:
type: object
required: [index-css]
properties:
index-css:
path: $DESIGNBOOK_DIRS_CSS_TOKENS/index.src.css
---


# Image styles:
image styles should both extend the existing config schema. one for entity types [image_style.md]. one for the scene schema [image-style-config]

# Design:
static-assets.md is not clear. Also a lot of how to with curl rules. Also duplication with resources/static-assets.md
A lot of rules may be not needed any more because of schema like scenes- and shell-scene-constraints.md and typography-tokens.md.


## extract-reference
- extract-reference.md task should moved more centeral or?
- extract-reference.md hat auch assets teile. hier soll nicht runtergeladen werden sondern nur in der designReference hinterlegt werden.
- Welche Fragen sind nicht druch params und das schema abgedeckt.
- Breakpints sollte durch einen resolver gelöst werden


## capture sollten keine playwright refernce haben weil playwright über rules gelöst werden.
- prüfen ob die playwright rules richtig sind.

# workflow cli-workflow:

Explaing the main logic. on start on on stage done tasks expanded if they have all params resolved. explain resolver. Each task is finished if he can resolve all results. after all tasks inside a stage is finished it starts again with expading etc. results can stored in workflow or have a path.

0.5 und 1.
## Step 0.5: Param Resolution und Step 1 ist. param resoultution ist ein allgemeines verhalten nicht ein step
Add workflow list --workflow <id> should work with id. extend the cli.
_debo() { npx storybook-addon-designbook "$@"; } ist nur ein alias. kein code block.

Das laden der config soll implizit passseren wenn innerhlab des bodys variablen gebraucht werdenn.

brauchen wir _debo workflow instructions --workflow $WORKFLOW_NAME --stage <step-name> ist unklar wann was gebraucht wird.

2. Task workflow explain in detail.

Es müssen alle files geladen werden die relevant sind. aber die haupt logik muss sein.

1. Read schema of the expected results propably. to resolve the schema is the goal of this task.
   1.b there might be provider for this result. check them. If you can't resolve the result properly ask the user for more infos.
2. Read the taks body properly.
3. Readd all blueprints and rules properly for this task.
4. Try hard to resolve the schema. Run done -> next task


3. After hooks erklären

Add rules to the bottom
- wait logic (zurück auf running springen bugt gerade.)
- Kein code im executor? alles als reference?

- Wir brauchen eigentlich kein cli config. das braucht nur der workflow itself zum auflösen der pfade. meistens. Falls doch sollte im skill stehen das man die cli config nutzen kann?


skill-creator: Hier muss viel klarer sein was in tasks drin stehen und was in blueprints und was in. Das steht schon im validate resource. das gehört in rule dateien damit diese auch beim erstellen der jeweiligen dateien validiert werden. 
in validate sollte auch ein verweis auf die jeweiligen rules geben. 