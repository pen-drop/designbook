// [tailwind-only] start
import '../css/app.src.css'
// [tailwind-only] end

/** @type { import('@storybook/html-vite').Preview } */
const preview = {
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}
export default preview
