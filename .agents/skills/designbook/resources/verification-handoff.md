# Completed check → repair intake

1. Read the completed check document and collect the complete issue lists from every comparison task, including all viewports and targets. Preserve their identifiers, evidence, severity and affected files. Completion: the whole issue set is accounted for.
2. If the combined list is empty, report the completed check and stop. Otherwise invoke the [repair intake](../skills/repair/SKILL.md) automatically with that whole list, the check path and reference/capture inputs. Completion: the repair intake owns all reported issues before planning its tasks.
3. Report the repair result and any remaining findings. A repair's recheck never invokes this handoff again; another repair needs a separately requested intake. Completion: there is at most one automatic repair workflow per completed check.
