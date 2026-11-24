declare module 'virtual:designbook-themes' {
  export const themes: Record<string, string>;
  export const themeNames: string[];
  export const defaultTheme: string;
}

declare module 'virtual:designbook-sections' {
  const sections: Array<Record<string, unknown>>;
  export default sections;
}
