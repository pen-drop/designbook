import React from 'react';
import { styled } from 'storybook/theming';
import { addons } from 'storybook/preview-api';

const StyledLink = styled.a(({ theme }) => ({
  color: 'inherit',
  textDecoration: 'none',
  '&:hover': {
    color: theme.color.secondary,
  },
}));

export function DeboLink({ storyId, title, name, children, style, className, ...rest }) {
  const href = storyId
    ? `?path=/story/${storyId}`
    : undefined;

  const handleClick = (e) => {
    e.preventDefault();
    const payload = storyId ? { storyId } : { title, name };
    addons.getChannel().emit('selectStory', payload);
  };

  return (
    <StyledLink
      href={href}
      onClick={handleClick}
      style={style}
      className={className}
      {...rest}
    >
      {children}
    </StyledLink>
  );
}
