import React from 'react';
import { styled } from 'storybook/theming';

const Table = styled.table(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: theme.typography.size.s2,
  fontFamily: theme.typography.fonts.base,
}));

const Th = styled.th(({ theme }) => ({
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: `2px solid ${theme.appBorderColor}`,
  fontSize: theme.typography.size.s1,
  fontWeight: 600,
  color: theme.color.mediumdark,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const Td = styled.td(({ theme }) => ({
  padding: '8px 12px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  color: theme.color.defaultText,
  verticalAlign: 'top',
}));

const MonoCell = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1,
}));

/**
 * DeboTable — Themed table primitives.
 *
 * Usage:
 *   <DeboTable columns={['Name','Type']} rows={data}
 *     renderRow={(item) => <tr>...</tr>} />
 *
 * Or use the sub-components directly:
 *   <DeboTable.Root> / <DeboTable.Th> / <DeboTable.Td> / <DeboTable.Mono>
 */
export function DeboTable({ columns, rows, renderRow }) {
  return (
    <Table>
      {columns && (
        <thead>
          <tr>
            {columns.map((col) => (
              <Th key={col}>{col}</Th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>{rows?.map(renderRow)}</tbody>
    </Table>
  );
}

DeboTable.Root = Table;
DeboTable.Th = Th;
DeboTable.Td = Td;
DeboTable.Mono = MonoCell;
