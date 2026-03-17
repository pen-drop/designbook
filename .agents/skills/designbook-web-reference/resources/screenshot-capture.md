# Screenshot Capture

Detailed instructions for capturing reference screenshots from a live website using the browser agent.

## Strategy

Capture screenshots at **3 scroll positions** per page to cover all component areas:

| Position | What it captures | Screenshot name |
|----------|-----------------|-----------------|
| Top (scroll=0) | Header + hero/banner | `[page]_hero` |
| Mid (scroll ~800px) | Content area | `[page]_body` |
| Bottom (scroll=max) | Footer + CTA sections | `[page]_footer` |

## Browser Agent Task Template

Use this as the `Task` parameter for `browser_subagent`:

```
Navigate to [URL] and capture screenshots at multiple scroll positions.

1. Maximize the window.
2. Take a screenshot at the top of the page. Save as "[page]_hero".
3. Scroll down approximately 800px and take a screenshot. Save as "[page]_body".
4. Scroll to the very bottom and take a screenshot. Save as "[page]_footer".

Return the paths to all saved screenshots.
```

## Tips

- **Maximize first** — Always maximize the browser window before capturing to get consistent viewport widths
- **Wait after scroll** — Add a brief wait (500ms) after scrolling to let lazy-loaded images and animations settle
- **Multiple pages** — If analyzing multiple pages (listing + detail), capture each in sequence within the same browser session to avoid unnecessary page loads
- **Cookie banners** — Dismiss cookie consent banners before capturing. Run:
  ```javascript
  document.querySelectorAll('[class*="cookie"], [class*="consent"], [id*="cookie"]').forEach(el => el.remove());
  ```
- **Responsive** — For responsive analysis, capture at desktop (1440px) first, then optionally at tablet (768px) and mobile (375px)
