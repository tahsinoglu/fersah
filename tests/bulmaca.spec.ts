import { expect, test } from '@playwright/test';

test.describe('Çengel Bulmaca', () => {
  for (const atlas of ['memleket', 'cihan']) {
    test(`${atlas}: harf yazılır, ipuçlarıyla çözülür, bitiş ekranı ve tur kaydı`, async ({ page }) => {
      await page.goto(`/bulmaca/${atlas}`);
      await expect(page.getByRole('grid')).toBeVisible({ timeout: 15000 });
      const words = Number((await page.getByLabel('İlerleme').textContent())!.split('/')[1]);
      expect(words).toBeGreaterThanOrEqual(7);
      // Yanlış harf yazılabilir ve silinebilir
      await page.getByRole('button', { name: 'Z', exact: true }).click();
      await page.getByRole('button', { name: 'Sil' }).click();
      for (let i = 0; i < 200 && !(await page.getByText('Bulmacayı çözdün!').count()); i++) {
        await page.getByRole('button', { name: 'Harf aç' }).click();
      }
      await expect(page.getByText('Bulmacayı çözdün!')).toBeVisible();
      await expect(page.getByText(`0/${words} kelime yardımsız`)).toBeVisible();
      const rounds = await page.evaluate(() => JSON.parse(localStorage.getItem('mc-progress-v1') ?? '{}').rounds ?? []);
      expect(rounds.some((r: { mode: string }) => r.mode === 'bulmaca')).toBe(true);
    });
  }
});
