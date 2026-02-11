import { test, expect } from '@playwright/test';

test('design tokens load correctly', async ({ page }) => {
    // 1. Visit the Design System page directly (iframe view)
    // This avoids dealing with the Storybook Manager UI and iframes
    await page.goto('http://localhost:6009/iframe.html?viewMode=docs&id=design-system--docs');

    // 2. Wait for the page to settle
    await page.waitForLoadState('networkidle');

    // 3. check for the presence of the colors
    // The DeboDesignTokensCard renders colors. Let's look for "primary" or the specific color values.
    // We saved "blue", "emerald", "slate".

    // Check content ("primary" label)
    const primaryLabel = page.locator('text=primary').first();
    await expect(primaryLabel).toBeVisible({ timeout: 5000 });

    // Check if the specific color value "blue" is present in the text
    const primaryValue = page.locator('text=blue').first();
    await expect(primaryValue).toBeVisible();
});

test('middleware returns tokens json', async ({ request }) => {
    const response = await request.get('http://localhost:6009/__designbook/load?path=design-tokens.json');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.exists).toBe(true);
    expect(data.content).toContain('"primary"');
    expect(data.content).toContain('"blue"');
});
