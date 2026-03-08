import { test, expect } from '@playwright/test';

test.describe('Goob Nonna Synth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.keyboard');
  });

  test.describe('Page Load', () => {
    test('renders without splash overlay', async ({ page }) => {
      await expect(page.locator('#start-overlay')).toHaveCount(0);
    });

    test('renders synth title strip', async ({ page }) => {
      await expect(page.locator('.synth-title-strip')).toBeVisible();
    });

    test('renders all module panels', async ({ page }) => {
      await expect(page.locator('.panel-arp-seq')).toBeVisible();
      await expect(page.locator('.panel-oscillators')).toBeVisible();
      const panelCount = await page.locator('.panel').count();
      expect(panelCount).toBeGreaterThanOrEqual(7);
    });

    test('renders keyboard with 32 keys', async ({ page }) => {
      await expect(page.locator('.key')).toHaveCount(32);
    });

    test('renders black and white keys with correct sizing', async ({ page }) => {
      const blackKeys = page.locator('.black-key');
      const whiteKeys = page.locator('.white-key');
      expect(await blackKeys.count()).toBeGreaterThan(0);
      expect(await whiteKeys.count()).toBeGreaterThan(0);
      const blackBox = await blackKeys.first().boundingBox();
      const whiteBox = await whiteKeys.first().boundingBox();
      expect(blackBox.height).toBeGreaterThan(50);
      expect(blackBox.width).toBeGreaterThan(10);
      expect(whiteBox.height).toBeGreaterThan(blackBox.height);
    });

    test('renders pitch and mod wheels in keyboard area', async ({ page }) => {
      const wheelsSection = page.locator('.keyboard-wheels');
      await expect(wheelsSection).toBeVisible();
      await expect(wheelsSection.locator('.wheel-container')).toHaveCount(2);
    });

    test('renders preset selector', async ({ page }) => {
      await expect(page.locator('#preset-select')).toBeVisible();
    });

    test('guide link exists in kebab menu', async ({ page }) => {
      await page.locator('#kebab-btn').click();
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

      await page.dispatchEvent('body', 'mouseup');
      await second.dispatchEvent('mousedown');
      await expect(second).toHaveClass(/active/);
      await expect(first).not.toHaveClass(/active/);
    });
  });

  test.describe('Keyboard - QWERTY', () => {
    test('pressing Z activates a key', async ({ page }) => {
      await page.keyboard.down('z');
      await expect(page.locator('.key.active')).toHaveCount(1);
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
      const fallbackNote = await page.locator('.key.active').getAttribute('data-note');
      expect(fallbackNote).toEqual(firstNote);
      await page.keyboard.up('z');
    });

    test('upper row keys work (Q)', async ({ page }) => {
      await page.keyboard.down('q');
      await expect(page.locator('.key.active')).toHaveCount(1);
      await page.keyboard.up('q');
    });
  });

  test.describe('Keyboard Labels', () => {
    test('shows QWERTY shortcut labels by default', async ({ page }) => {
      const labels = page.locator('.key-label');
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      expect(text).not.toMatch(/^[A-G][#b]?\d$/);
    });

    test('Shift shows note names while held', async ({ page }) => {
      await page.keyboard.down('Shift');
      const labels = page.locator('.white-key .key-label');
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      expect(text).toMatch(/^[A-G][#b]?\d$/);
      await page.keyboard.up('Shift');
    });

    test('releasing Shift reverts to shortcuts', async ({ page }) => {
      await page.keyboard.down('Shift');
      await page.keyboard.up('Shift');
      const labels = page.locator('.white-key .key-label');
      const firstLabel = labels.first();
      const text = await firstLabel.textContent();
      expect(text).not.toMatch(/^[A-G][#b]?\d$/);
    });
  });

  test.describe('Tooltips', () => {
    test('controls have data-tooltip attributes', async ({ page }) => {
      const tooltipElements = page.locator('[data-tooltip]');
      const count = await tooltipElements.count();
      expect(count).toBeGreaterThan(20);
    });

    test('Shift adds shift-held class to body', async ({ page }) => {
      await page.keyboard.down('Shift');
      await expect(page.locator('body')).toHaveClass(/shift-held/);
      await page.keyboard.up('Shift');
      await expect(page.locator('body')).not.toHaveClass(/shift-held/);
    });
  });

  test.describe('Knobs', () => {
    test('knobs are present and interactive', async ({ page }) => {
      const knobs = page.locator('.knob');
      expect(await knobs.count()).toBeGreaterThan(0);
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
      expect(await page.locator('.jack-output').count()).toBeGreaterThan(0);
      expect(await page.locator('.jack-input').count()).toBeGreaterThan(0);
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
