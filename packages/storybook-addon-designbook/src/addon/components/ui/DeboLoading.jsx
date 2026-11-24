import React from 'react';
import { Loader } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

const LoadingWrapper = styled.div({
  display: 'flex',
  justifyContent: 'center',
  padding: '48px 0',
});

export function DeboLoading() {
  return (
    <LoadingWrapper>
      <Loader />
    </LoadingWrapper>
  );
}
