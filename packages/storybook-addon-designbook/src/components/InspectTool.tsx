import React, { memo, useCallback, useState } from 'react';
import { useChannel, useParameter } from 'storybook/manager-api';
import { IconButton } from 'storybook/internal/components';
import { INSPECT_TOOL_ID, EVENTS } from '../constants';
import { PointerDefaultIcon } from '@storybook/icons';

export const InspectTool = memo(function InspectTool() {
  const [active, setActive] = useState(false);
  const scene = useParameter<Record<string, unknown> | undefined>('scene');

  const emit = useChannel({});

  const toggle = useCallback(() => {
    const next = !active;
    setActive(next);
    emit(EVENTS.INSPECT_MODE, next);
  }, [active, emit]);

  if (!scene) return null;

  return (
    <IconButton key={INSPECT_TOOL_ID} active={active} title="Inspect scene structure" onClick={toggle}>
      <PointerDefaultIcon />
    </IconButton>
  );
});
