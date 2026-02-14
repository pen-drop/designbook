import React, { memo } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

interface PanelProps {
  active?: boolean;
}

const Container = styled.div(({ theme }) => ({
  padding: '1rem',
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
}));

const Title = styled.h3(({ theme }) => ({
  marginTop: 0,
  marginBottom: '0.5rem',
  fontWeight: theme.typography.weight.bold,
}));

const List = styled.ul({
  listStyleType: 'none',
  padding: 0,
  margin: 0,
});

const Item = styled.li(({ theme }) => ({
  padding: '0.5rem 0',
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

const Command = styled.code(({ theme }) => ({
  background: theme.background.hoverable,
  padding: '0.2em 0.4em',
  borderRadius: '4px',
  fontFamily: theme.typography.fonts.mono,
}));

export const Panel: React.FC<PanelProps> = memo(function DesignbookPanel(props: PanelProps) {
  return (
    <AddonPanel active={props.active ?? false}>
      <Container>
        <Title>Designbook Active</Title>
        <p>Use AI commands in your editor to interact with Designbook.</p>

        <Title style={{ marginTop: '1rem' }}>Available Commands</Title>
        <List>
          <Item>
            <Command>/debo-product-vision</Command> - Define product vision
          </Item>
          <Item>
            <Command>/debo-product-roadmap</Command> - Create roadmap
          </Item>
          <Item>
            <Command>/debo-data-model</Command> - Define data model
          </Item>
          <Item>
            <Command>/debo-design-tokens</Command> - Design-Tokens document
          </Item>
        </List>
      </Container>
    </AddonPanel>
  );
});
