import React from 'react';
import { styled } from 'storybook/theming';

// ─── Shared ──────────────────────────────────────────────────────────────────

const Section = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

const SectionLabel = styled.h3(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  lineHeight: '16px',
  color: theme.textMutedColor,
  margin: 0,
}));

const Wrapper = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 32,
});

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: theme.typography.fonts.mono,
  fontSize: 12,
  fontWeight: 500,
  padding: '3px 10px',
  borderRadius: 6,
  background: theme.background.hoverable,
  border: `1px solid ${theme.appBorderColor}`,
  color: theme.color.defaultText,
}));

const ChipRow = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
});

// ─── Link ─────────────────────────────────────────────────────────────────────

const LinkCard = styled.a(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.background.content,
  color: theme.color.defaultText,
  textDecoration: 'none',
  fontFamily: theme.typography.fonts.base,
  fontSize: 14,
  fontWeight: 500,
  '&:hover': {
    background: theme.background.hoverable,
  },
}));

const LinkTypeBadge = styled.span(({ $type, theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  padding: '2px 6px',
  borderRadius: 4,
  flexShrink: 0,
  ...($type === 'figma'
    ? { background: '#FFF0F6', color: '#E8317A' }
    : { background: '#EFF6FF', color: '#155DFC' }),
}));

const LinkLabel = styled.span({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const LinkUrl = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  fontSize: 11,
  color: theme.textMutedColor,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 200,
}));

function LinkEntry({ type, url, label }) {
  return (
    <LinkCard href={url} target="_blank" rel="noopener noreferrer">
      <LinkTypeBadge $type={type}>{type}</LinkTypeBadge>
      <LinkLabel>{label || url}</LinkLabel>
      <LinkUrl>{url}</LinkUrl>
    </LinkCard>
  );
}

// ─── Bullet List ──────────────────────────────────────────────────────────────

const BulletList = styled.ul(({ theme }) => ({
  margin: 0,
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}));

const BulletItem = styled.li(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 14,
  lineHeight: '22px',
  color: theme.color.defaultText,
}));

// ─── MCP ──────────────────────────────────────────────────────────────────────

const McpCard = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.background.content,
  fontFamily: theme.typography.fonts.base,
  fontSize: 14,
}));

const McpName = styled.span(({ theme }) => ({
  fontWeight: 600,
  color: theme.color.defaultText,
}));

const McpUrl = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  fontSize: 12,
  color: theme.textMutedColor,
}));

// ─── Skills ───────────────────────────────────────────────────────────────────

const SkillBadge = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: theme.typography.fonts.base,
  fontSize: 13,
  fontWeight: 600,
  padding: '4px 12px',
  borderRadius: 8,
  background: '#F0FDF4',
  color: '#166534',
  border: '1px solid #BBF7D0',
}));

// ─── Main export ──────────────────────────────────────────────────────────────

export function DeboDesignGuidelines({ data }) {
  if (!data) return null;

  const { references, design_reference, principles, component_patterns, naming, mcp, skills } = data;

  return (
    <Wrapper>
      {references?.length > 0 && (
        <Section>
          <SectionLabel>References</SectionLabel>
          {references.map((ref, i) => (
            <LinkEntry key={i} type={ref.type} url={ref.url} label={ref.label} />
          ))}
        </Section>
      )}

      {design_reference?.url && (
        <Section>
          <SectionLabel>Design Reference</SectionLabel>
          <LinkEntry type={design_reference.type} url={design_reference.url} label={design_reference.label} />
        </Section>
      )}

      {principles?.length > 0 && (
        <Section>
          <SectionLabel>Principles</SectionLabel>
          <BulletList>
            {principles.map((p, i) => <BulletItem key={i}>{p}</BulletItem>)}
          </BulletList>
        </Section>
      )}

      {component_patterns?.length > 0 && (
        <Section>
          <SectionLabel>Component Patterns</SectionLabel>
          <BulletList>
            {component_patterns.map((p, i) => <BulletItem key={i}>{p}</BulletItem>)}
          </BulletList>
        </Section>
      )}

      {naming?.convention && (
        <Section>
          <SectionLabel>Naming</SectionLabel>
          <ChipRow>
            <Chip>{naming.convention}</Chip>
            {naming.examples?.map((ex, i) => <Chip key={i}>{ex}</Chip>)}
          </ChipRow>
        </Section>
      )}

      {mcp?.server && (
        <Section>
          <SectionLabel>MCP Server</SectionLabel>
          <McpCard>
            <McpName>{mcp.server}</McpName>
            {mcp.url && <McpUrl>{mcp.url}</McpUrl>}
          </McpCard>
        </Section>
      )}

      {skills?.length > 0 && (
        <Section>
          <SectionLabel>Auto-load Skills</SectionLabel>
          <ChipRow>
            {skills.map((s, i) => <SkillBadge key={i}>{s}</SkillBadge>)}
          </ChipRow>
        </Section>
      )}
    </Wrapper>
  );
}
