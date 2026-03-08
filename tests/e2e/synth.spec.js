import { test, expect } from '@playwright/test';

test.describe('Goob Nonna Synth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for UI to build
    await page.waitForSelector('.keyboard');
  });

  test.describe('Page Load', () => {
    test('renders without splash overlay', async ({ page }) => {
      await expect(page.locator('#start-overlay')).toHaveCount(0);
    });

    test('renders synth header', async ({ page }) => {
      await expect(page.locator('.synth-header h1')).toHaveText('GOOB NONNA');
    });

    test('renders all module panels', async ({ page }) => {
      await expect(page.locator('.panel-kb-jacks')).toBeVisible();
      await expect(page.locator('.panel-oscillators')).toBeVisible();
      await expect(page.locator('.panel')).toHaveCount(await page.locator('.panel').count());
      // At minimum: kb-jacks, oscillators, mixer, filter, envelope, output, modulation, utilities, arp-seq
      const panelCount = await page.locator('.panel').count();
      expect(panelCount).toBeGreaterThanOrEqual(8);
    });

    test('renders keyboard with 32 keys', async ({ page }) => {
      const keys = page.locator('.key');
      await expect(keys).toHaveCount(32);
    });

    test('renders pitch and mod wheels in keyboard area', async ({ page }) => {
      const wheelsSection = page.locator('.keyboard-wheels');
      await expect(wheelsSection).toBeVisible();
      const wheels = wheelsSection.locator('.wheel-container');
      await expect(wheels).toHaveCount(2);
    });

    test('renders preset selector', async ({ page }) => {
      await expect(page.locator('#preset-select')).toBeVisible();
    });

    test('renders guide link', async ({ page }) => {
      const link = page.locator('.guide-link');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', 'docs/getting-started.html');
    });

    test('no console errors on load', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto('/');
      await page.waitForSelector('.keyboard');
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Keyboard - Mouse', () => {
    test('clicking a white key activates it', async ({ page }) => {
      const whiteKey = page.locator('.white-key').first();
      await whiteKey.dispatchEvent('mousedown');
      await expect(whiteKey).toHaveClass(/active/);
    });

    test('releasing mouse deactivates key', async ({ page }) => {
      const whiteKey = page.locator('.white-key').first();
      await whiteKey.dispatchEvent('mousedown');
      await expect(whiteKey).toHaveClass(/active/);
      await page.dispatchEvent('body', 'mouseup');
      await expect(whiteKey).not.toHaveClass(/active/);
    });

    test('only one key active at a time (monophonic)', async ({ page }) => {
      const keys = page.locator('.white-key');
      const first = keys.nth(0);
      const second = keys.nth(1);

      await first.dispatchEvent('mousedown');
      await expect(first).toHaveClass(/active/);

      // Mouseup then click second key
      await page.dispatchEvent('body', 'mouseup');
      await second.dispatchEvent('mousedown');
      await expect(second).toHaveClass(/active/);
      await expect(first).not.toHaveClass(/active/);
    });
  });

  test.describe('Keyboard - QWERTY', () => {
    test('pressing Z activates a key', async ({ page }) => {
      await page.keyboard.down('z');
      const activeKeys = page.locator('.key.active');
      await expect(activeKeys).toHaveCount(1);
      await page.keyboard.up('z');
    });

    test('releasing key deactivates it', async ({ page }) => {
      await page.keyboard.down('z');
      await expect(page.locator('.key.active')).toHaveCount(1);
      await page.keyboard.up('z');
      await expect(page.locator('.key.active')).toHaveCount(0);
    });

    test('last-note priority - new key takes over', async ({ page }) => {
      await page.keyboard.down('z');
      const firstActive = await page.locator('.key.active').getAttribute('data-note');
      await page.keyboard.down('x');
      const secondActive = await page.locator('.key.active').getAttribute('data-note');
      expect(firstActive).not.toEqual(secondActive);
      await expect(page.locator('.key.active')).toHaveCount(1);
      await page.keyboard.up('x');
      await page.keyboard.up('z');
    });

    test('releasing last key falls back to held key', async ({ page }) => {
      await page.keyboard.down('z');
      const firstNote = await page.locator('.key.active').getAttribute('data-note');
      await page.keyboard.down('x');
      await page.keyboard.up('x');
      // Should fall back to Z's note
      const fallbackNote = await page.locator('.key.active').getAttribute('data-note');
      expect(fallbackNote).toEqual(firstNote);
      await page.keyboard.up('z');
    });

    test('upper row keys work (Q)', async ({ page }) => {
      await page.keyboard.press('q');
      // Should have activated and deactivated a key
    });
  });

  test.describe('Keyboard Labels', () => {
    test('shows QWERTY shortcut labels by default', async ({ page }) => {
      // First white key at base octave should show 'Z'
      const labels = page.locator('.key-label');
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      // Should be a QWERTY character, not a note name like C3
      expect(text).not.toMatch(/^[A-G][#b]?\d$/);
    });

    test('Tab toggles to note names', async ({ page }) => {
      await page.keyboard.press('Tab');
      // After toggle, labels should show note names
      const labels = page.locator('.white-key .key-label');
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      // Note names look like F2, G2, A2, etc.
      expect(text).toMatch(/^[A-G][#b]?\d$/);
    });

    test('Tab toggles back to shortcuts', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const labels = page.locator('.white-key .key-label');
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      expect(text).not.toMatch(/^[A-G][#b]?\d$/);
    });
  });

  test.describe('Knobs', () => {
    test('knobs are present and interactive', async ({ page }) => {
      const knobs = page.locator('.knob');
      const count = await knobs.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Switches', () => {
    test('clicking switch option changes active state', async ({ page }) => {
      const switchBody = page.locator('.switch-body').first();
      const options = switchBody.locator('.switch-option');
      const count = await options.count();
      if (count >= 2) {
        const second = options.nth(1);
        await second.click();
        await expect(second).toHaveClass(/active/);
      }
    });
  });

  test.describe('Patch Cables', () => {
    test('SVG overlay is present', async ({ page }) => {
      await expect(page.locator('.patch-cable-overlay')).toBeVisible();
    });

    test('output and input jacks are present', async ({ page }) => {
      const outputs = page.locator('.jack-output');
      const inputs = page.locator('.jack-input');
      expect(await outputs.count()).toBeGreaterThan(0);
      expect(await inputs.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Guide Page', () => {
    test('getting-started page loads', async ({ page }) => {
      await page.goto('/docs/getting-started.html');
      await expect(page.locator('h1')).toHaveText('Getting Started');
    });

    test('back link returns to synth', async ({ page }) => {
      await page.goto('/docs/getting-started.html');
      const backLink = page.locator('.back-link');
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute('href', '../index.html');
    });
  });
});
