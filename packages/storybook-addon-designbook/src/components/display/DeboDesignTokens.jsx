import React from 'react';
import { styled } from 'storybook/theming';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

const isToken = (obj) => obj && typeof obj === 'object' && '$value' in obj;

function isLightColor(hex) {
  if (!hex || !hex.startsWith('#')) return false;
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

// ─── Color Section ──────────────────────────────────────────────────────────

const COLOR_CATEGORIES = ['primary', 'secondary', 'accent', 'neutral', 'base', 'info', 'success', 'warning', 'error'];

function groupColorTokens(tokenEntries) {
  const groups = new Map();
  for (const cat of COLOR_CATEGORIES) groups.set(cat, []);
  for (const [key, token] of tokenEntries) {
    const cat = COLOR_CATEGORIES.find(c => key === c || key.startsWith(c + '-'));
    if (cat) groups.get(cat).push({ key, token });
  }
  return Array.from(groups.entries())
    .filter(([, tokens]) => tokens.length > 0)
    .map(([category, tokens]) => ({ category, tokens }));
}

const SwatchWrapper = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: 80,
});

const SwatchBox = styled.div({
  width: 80,
  height: 64,
  borderRadius: 8,
  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
});

const SwatchName = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontWeight: 600,
  fontSize: 12,
  lineHeight: '15px',
  color: theme.color.defaultText,
}));

const SwatchHex = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  fontSize: 11,
  lineHeight: '16.5px',
  color: theme.color.mediumdark,
}));

function DeboColorSwatch({ name, value }) {
  const light = isLightColor(value);
  return (
    <SwatchWrapper>
      <SwatchBox
        style={{
          backgroundColor: value,
          ...(light ? { border: '1px solid #E2E8F0' } : {}),
        }}
        title={value}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SwatchName>{name}</SwatchName>
        <SwatchHex>{value}</SwatchHex>
      </div>
    </SwatchWrapper>
  );
}

const CategoryRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 128,
  paddingTop: 16,
}));

const CategoryLabel = styled.span(({ theme }) => ({
  width: 96,
  flexShrink: 0,
  fontFamily: theme.typography.fonts.base,
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '20px',
  letterSpacing: '-0.15px',
  color: theme.color.defaultText,
}));

const SwatchRow = styled.div({
  display: 'flex',
  gap: 24,
  flexWrap: 'wrap',
});

function DeboColorCategoryRow({ category, tokens, isLast }) {
  return (
    <CategoryRow style={!isLast ? { borderBottom: '1px solid #F1F5F9' } : {}}>
      <CategoryLabel>{category.charAt(0).toUpperCase() + category.slice(1)}</CategoryLabel>
      <SwatchRow>
        {tokens.map(({ key, token }) => (
          <DeboColorSwatch key={key} name={key} value={token.$value} />
        ))}
      </SwatchRow>
    </CategoryRow>
  );
}

function DeboColorSection({ group }) {
  const tokenEntries = Object.entries(group).filter(([k]) => !k.startsWith('$'));
  const colorTokens = tokenEntries.filter(([, v]) => isToken(v));
  const categories = groupColorTokens(colorTokens);

  return (
    <DeboCollapsible title="Color" count={colorTokens.length} defaultOpen={true}>
      <div style={{ padding: '4px 24px 24px' }}>
        {categories.map(({ category, tokens }, i) => (
          <DeboColorCategoryRow
            key={category}
            category={category}
            tokens={tokens}
            isLast={i === categories.length - 1}
          />
        ))}
      </div>
    </DeboCollapsible>
  );
}

// ─── Typography Section ─────────────────────────────────────────────────────

const TYPE_SCALE = [
  { style: 'H1', fontSize: 30, lineHeight: 38, weight: 700 },
  { style: 'H2', fontSize: 24, lineHeight: 32, weight: 700 },
  { style: 'H3', fontSize: 20, lineHeight: 28, weight: 700 },
  { style: 'Title', fontSize: 18, lineHeight: 26, weight: 700 },
  { style: 'Body', fontSize: 16, lineHeight: 24, weight: 400 },
  { style: 'Small', fontSize: 14, lineHeight: 20, weight: 400 },
  { style: 'Caption', fontSize: 12, lineHeight: 16, weight: 400 },
];

const FONT_TOKEN_META = {
  heading: { label: 'Headlines', aaWeight: 700 },
  body: { label: 'Body', aaWeight: 500 },
  mono: { label: 'Mono', aaWeight: 400 },
};

function isMono(tokenKey, value) {
  return tokenKey === 'mono' || (value && value.toLowerCase().includes('mono'));
}

const FontCardWrapper = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  background: theme.background.content,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 16,
  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
  overflow: 'hidden',
}));

const FontPreview = styled.div({
  padding: '24px 24px 0',
});

const FontInfo = styled.div({
  padding: '24px 24px 16px',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
});

const FontName = styled.p(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: '28px',
  letterSpacing: '-0.44px',
  color: theme.color.defaultText,
  margin: 0,
}));

const FontLabel = styled.p(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.5,
  color: theme.color.mediumdark,
  margin: 0,
}));

const FontTypeBadge = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  padding: '4px 8px',
  borderRadius: 8,
  flexShrink: 0,
}));

const CharPreview = styled.div(({ theme }) => ({
  borderTop: `1px solid ${theme.appBorderColor}`,
  padding: '16px 24px 24px',
}));

function DeboFontCard({ tokenKey, value }) {
  const meta = FONT_TOKEN_META[tokenKey] || { label: tokenKey, aaWeight: 500 };
  const mono = isMono(tokenKey, value);
  const preview = mono ? '0 1 2 3 4 5 6 7 8 9 { }' : 'A B C D E F G H I J K L';
  const badgeStyle = mono
    ? { background: '#FAF5FF', color: '#9810FA' }
    : { background: '#EFF6FF', color: '#155DFC' };

  return (
    <FontCardWrapper>
      <FontPreview>
        <span style={{ fontFamily: value, fontSize: 56, fontWeight: meta.aaWeight, display: 'block', lineHeight: 1, color: '#1D293D' }}>
          Aa
        </span>
      </FontPreview>
      <FontInfo>
        <div>
          <FontName>{value}</FontName>
          <FontLabel>{meta.label}</FontLabel>
        </div>
        <FontTypeBadge style={badgeStyle}>{mono ? 'Mono' : 'Sans'}</FontTypeBadge>
      </FontInfo>
      <CharPreview>
        <span style={{ fontFamily: value, fontSize: 16, fontWeight: 500, lineHeight: 1.625, color: '#90A1B9' }}>
          {preview}
        </span>
      </CharPreview>
    </FontCardWrapper>
  );
}

const TypeScaleWrapper = styled.div(({ theme }) => ({
  background: theme.background.content,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 16,
  boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)',
  overflow: 'hidden',
}));

const TypeScaleHeader = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '104px 1fr 130px',
  background: theme.background.hoverable || '#F8FAFC',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  padding: '12px 24px',
}));

const TypeScaleHeaderLabel = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.57px',
  color: theme.color.mediumdark,
}));

const TypeScaleRow = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '104px 1fr 130px',
  alignItems: 'center',
  padding: '16px 24px',
}));

const StyleName = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 15,
  fontWeight: 700,
  color: '#90A1B9',
}));

const SizeBadge = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: '#F1F5F9',
  borderRadius: 8,
  padding: '4px 10px',
  fontFamily: theme.typography.fonts.mono,
  fontSize: 13,
  whiteSpace: 'nowrap',
}));

function DeboTypeScale({ headingFont }) {
  return (
    <TypeScaleWrapper>
      <TypeScaleHeader>
        <TypeScaleHeaderLabel>Style</TypeScaleHeaderLabel>
        <TypeScaleHeaderLabel>Preview</TypeScaleHeaderLabel>
        <TypeScaleHeaderLabel style={{ textAlign: 'right' }}>Size / LH</TypeScaleHeaderLabel>
      </TypeScaleHeader>
      {TYPE_SCALE.map(({ style, fontSize, lineHeight, weight }, i) => (
        <TypeScaleRow key={style} style={i < TYPE_SCALE.length - 1 ? { borderBottom: '1px solid #F1F5F9' } : {}}>
          <StyleName>{style}</StyleName>
          <span style={{
            fontFamily: headingFont,
            fontSize,
            fontWeight: weight,
            lineHeight: `${lineHeight}px`,
            color: '#1D293D',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: 16,
          }}>
            The quick brown fox jumps over the lazy dog
          </span>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SizeBadge>
              <span style={{ color: '#45556C' }}>{fontSize}px</span>
              <span style={{ color: '#90A1B9' }}>/</span>
              <span style={{ color: '#62748E' }}>{lineHeight}px</span>
            </SizeBadge>
          </div>
        </TypeScaleRow>
      ))}
    </TypeScaleWrapper>
  );
}

function DeboTypographySection({ group }) {
  const tokenEntries = Object.entries(group).filter(([k]) => !k.startsWith('$'));
  const fontTokens = tokenEntries.filter(([, v]) => isToken(v) && v.$type === 'fontFamily');
  const headingFont = (fontTokens.find(([k]) => k === 'heading') || fontTokens[0])?.[1]?.$value || 'sans-serif';

  return (
    <DeboCollapsible title="Typography" count={fontTokens.length} defaultOpen={true}>
      <div style={{ padding: '12px 32px 0', display: 'flex', flexDirection: 'column', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SubSectionTitle>Font Families</SubSectionTitle>
          <div style={{ display: 'flex', gap: 24 }}>
            {fontTokens.map(([key, token]) => (
              <DeboFontCard key={key} tokenKey={key} value={token.$value} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SubSectionTitle>Type Scale</SubSectionTitle>
          <DeboTypeScale headingFont={headingFont} />
        </div>
      </div>
    </DeboCollapsible>
  );
}

const SubSectionTitle = styled.h4(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 14,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.55px',
  lineHeight: '20px',
  color: theme.color.defaultText,
  margin: 0,
}));

// ─── Generic token fallback ─────────────────────────────────────────────────

const GenericTokenRow = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: theme.typography.size.s2,
  padding: '4px 0',
}));

const GenericTokenName = styled.span(({ theme }) => ({
  color: theme.color.defaultText,
  opacity: 0.7,
}));

const GenericTokenValue = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  color: theme.color.defaultText,
}));

function GenericToken({ name, value }) {
  return (
    <GenericTokenRow>
      <GenericTokenName>{name}:</GenericTokenName>
      <GenericTokenValue>{String(value)}</GenericTokenValue>
    </GenericTokenRow>
  );
}

function GenericGroup({ name, group }) {
  const entries = Object.entries(group).filter(([k]) => !k.startsWith('$'));
  const tokens = entries.filter(([, v]) => isToken(v));
  const subgroups = entries.filter(([, v]) => !isToken(v) && typeof v === 'object');

  return (
    <DeboCollapsible title={name} count={tokens.length} defaultOpen={false}>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tokens.map(([k, v]) => <GenericToken key={k} name={k} value={v.$value} />)}
        {subgroups.map(([k, v]) => <GenericGroup key={k} name={k} group={v} />)}
      </div>
    </DeboCollapsible>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

const SectionLabel = styled.p(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  lineHeight: '16px',
  color: '#90A1B9',
}));

const TokensWrapper = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
});

export function DeboDesignTokens({ tokens }) {
  if (!tokens || Object.keys(tokens).length === 0) return null;

  const colorGroup = tokens.color;
  const typographyGroup = tokens.typography;
  const otherGroups = Object.entries(tokens).filter(
    ([k]) => !k.startsWith('$') && k !== 'color' && k !== 'typography'
  );

  const colorCount = colorGroup
    ? Object.entries(colorGroup).filter(([k, v]) => !k.startsWith('$') && isToken(v)).length
    : 0;

  const hasTypography = typographyGroup &&
    Object.entries(typographyGroup).some(([k, v]) => !k.startsWith('$') && isToken(v));

  return (
    <TokensWrapper>
      <SectionLabel>Design Tokens</SectionLabel>
      {colorGroup && colorCount > 0 && <DeboColorSection group={colorGroup} />}
      {hasTypography && <DeboTypographySection group={typographyGroup} />}
      {otherGroups.map(([key, group]) => (
        typeof group === 'object' && !isToken(group)
          ? <GenericGroup key={key} name={key} group={group} />
          : null
      ))}
    </TokensWrapper>
  );
}
