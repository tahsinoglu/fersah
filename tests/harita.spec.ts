import { expect, test, type Page } from '@playwright/test';

const ready = async (p: Page) => {
  await p.waitForSelector('path.unit');
  // Kamera ilk karede yerleşsin
  await p.waitForFunction(() => !!(document.querySelector('.world') as SVGGElement | null)?.style.transform);
  await p.waitForTimeout(150);
};
test.describe('seviyeli gezinme', () => {
  test('bölgeye, ile in; geri tuşu birer seviye çıkar', async ({ page, isMobile }) => {
    await page.goto('/memleket');
    await ready(page);
    const tap = (sel: string) => (isMobile ? page.locator(sel).tap() : page.locator(sel).click());
    await tap('path[data-u="61"]'); // Trabzon → Karadeniz bölgesi
    await expect(page).toHaveURL(/\/memleket\/karadeniz$/);
    await expect(page.getByRole('heading', { name: 'Karadeniz Bölgesi' })).toBeVisible();
    await page.waitForTimeout(900);
    await tap('path[data-u="53"]');
    await expect(page).toHaveURL(/\/memleket\/karadeniz\/rize$/);
    await expect(page.getByRole('heading', { name: 'Rize' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/memleket\/karadeniz$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/memleket$/);
  });

  test('Esc ve yol göstergesi yukarı çıkarır', async ({ page }) => {
    await page.goto('/cihan/afrika/kenya');
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Kenya' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/cihan\/afrika$/);
    await page.getByRole('navigation', { name: 'Konum' }).getByRole('button', { name: 'Dünya' }).click();
    await expect(page).toHaveURL(/\/cihan$/);
  });

  test('yan geçiş geçmişi şişirmez: kardeş ilden geri dönünce bölgeye çıkılır', async ({ page, isMobile }) => {
    await page.goto('/memleket');
    await ready(page);
    await page.goto('/memleket/karadeniz');
    await ready(page);
    const tap = (sel: string) => (isMobile ? page.locator(sel).tap({ force: true }) : page.locator(sel).click({ force: true }));
    await page.waitForTimeout(900);
    await tap('path[data-u="53"]');
    await expect(page).toHaveURL(/rize$/);
    await page.waitForTimeout(900);
    await tap('path[data-u="61"]');
    await expect(page).toHaveURL(/trabzon$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/memleket\/karadeniz$/);
  });

  test('geçersiz adres düzeltilir', async ({ page }) => {
    await page.goto('/memleket/ege/rize');
    await ready(page);
    await expect(page).toHaveURL(/\/memleket\/ege$/);
  });
});

test.describe('arayüz', () => {
  test('arama ile ile gidilir, geri tuşu bölgeye döner', async ({ page }) => {
    await page.goto('/memleket');
    await ready(page);
    await page.getByRole('combobox').fill('sanliurfa');
    await expect(page.getByRole('option').first()).toContainText('Şanlıurfa');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/memleket\/guneydogu-anadolu\/sanliurfa$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/memleket\/guneydogu-anadolu$/);
  });

  test('aramada başka bölüme geçilebilir', async ({ page }) => {
    await page.goto('/memleket');
    await ready(page);
    await page.getByRole('combobox').fill('japonya');
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/\/cihan\/asya\/japonya$/, { timeout: 5000 });
  });

  test('tema seçici koyu temaya geçer ve hatırlar', async ({ page }) => {
    await page.goto('/memleket');
    await ready(page);
    await page.getByRole('button', { name: /^Tema/ }).click();
    await page.getByRole('menuitemradio', { name: 'Koyu' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('klavye: oklarla gez, Enter ile seç', async ({ page, isMobile }) => {
    test.skip(isMobile, 'masaüstü');
    await page.goto('/memleket');
    await ready(page);
    await page.locator('svg.map').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.map-tip')).toHaveClass(/tip-on/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/memleket\/[a-z-]+$/);
  });

  test('basılı tutma önizler ama seçmez', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'telefon');
    await page.goto('/memleket/karadeniz');
    await ready(page);
    await page.waitForTimeout(900);
    const box = (await page.locator('path[data-u="55"]').boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(500);
    await expect(page.locator('.map-tip')).toHaveClass(/tip-on/);
    await expect(page.locator('.map-tip')).toHaveText('Samsun');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/memleket\/karadeniz$/);
  });

  test('tekerlekle belirgin uzaklaşma bir üst seviyeye çıkar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'masaüstü');
    await page.goto('/memleket/karadeniz');
    await ready(page);
    await page.waitForTimeout(900);
    await page.mouse.move(500, 400);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
    await expect(page).toHaveURL(/\/memleket$/, { timeout: 3000 });
  });
});

test.describe('kapsama', () => {
  test.use({ reducedMotion: 'reduce' });

  test('81 ilin hepsi haritada tıklanabilir', async ({ page, isMobile }) => {
    test.skip(isMobile, 'masaüstünde bir kez yeterli');
    await page.goto('/memleket');
    await ready(page);
    const ids = await page.$$eval('path.unit', (els) => els.map((e) => (e as SVGPathElement).dataset.u!));
    expect(ids).toHaveLength(81);
    const failures: string[] = [];
    for (const id of ids) {
      const group = await page.$eval(`path[data-u="${id}"]`, (e) => (e.parentElement as unknown as SVGGElement).dataset.g!);
      await page.goto(`/memleket/${group}`);
      await ready(page);
      const pt = await page.evaluate((uid) => {
        const el = document.querySelector(`text[data-key="u:${uid}"]`) as SVGTextElement;
        return { x: Number(el.getAttribute('x')), y: Number(el.getAttribute('y')) };
      }, id);
      const hitId = await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y)?.closest('[data-u]') as SVGElement | null)?.dataset.u, pt);
      if (hitId !== id) failures.push(`${id}→${hitId}`);
    }
    expect(failures).toEqual([]);
  });

  test('tüm ülkeler kendi kıtasında tıklanabilir (küçük adalar dahil)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'masaüstünde bir kez yeterli');
    await page.goto('/cihan');
    await ready(page);
    const groups = await page.$$eval('g.grp', (gs) => gs.map((g) => (g as unknown as SVGGElement).dataset.g!));
    const failures: string[] = [];
    let checked = 0;
    for (const g of groups) {
      if (g === 'antarktika') continue;
      await page.goto(`/cihan/${g}`);
      await ready(page);
      const pts = await page.$$eval('text.lbl', (ts) =>
        ts.map((t) => ({ id: (t as SVGTextElement).dataset.key!.slice(2), x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')) })),
      );
      for (const p of pts) {
        checked++;
        if (p.x < 0 || p.y < 0 || p.x > 1366 || p.y > 860) {
          failures.push(`${g}:${p.id} ekran dışı`);
          continue;
        }
        // Gerçek işaretçi mantığıyla: imleci getir, vurgulanan birimi oku
        await page.mouse.move(p.x, p.y);
        const got = await page.evaluate(() => (document.querySelector('path.unit.hot') as SVGPathElement | null)?.dataset.u);
        if (got !== p.id) failures.push(`${g}:${p.id}→${got}`);
      }
    }
    expect(checked).toBeGreaterThan(190);
    expect(failures).toEqual([]);
  });
});
