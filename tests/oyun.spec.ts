import { expect, test, type Page } from '@playwright/test';
import { ILLER } from '../src/data/memleket';

const idByName = new Map(ILLER.map((il) => [il.ad, il.plaka]));

const ready = async (p: Page) => {
  await p.waitForSelector('path.unit', { state: 'attached' });
  await p.waitForFunction(() => !!(document.querySelector('.world') as SVGGElement | null)?.style.transform);
  await p.waitForTimeout(150);
};

/** Soru kartındaki ili haritada "tıkla" (yolun kendisine olay gönderilir, şekil içbükey olsa da doğru hedef) */
async function answerFind(p: Page, correct: boolean) {
  const name = (await p.locator('header h1').first().textContent())!.trim();
  const id = idByName.get(name)!;
  expect(id, name).toBeTruthy();
  const target = correct ? id : await p.$eval(`path.unit[data-u]:not([data-u="${id}"])`, (e) => (e as SVGPathElement).dataset.u!);
  await p.locator(`path.unit[data-u="${target}"]`).dispatchEvent('click');
}

test.use({ reducedMotion: 'reduce' });

test.describe('oyun', () => {
  test('bölge panelinden mod seçip oyuna girilir', async ({ page }) => {
    await page.goto('/memleket/karadeniz');
    await ready(page);
    await page.getByRole('button', { name: 'Bu bölgeyi oyna' }).first().click();
    await page.getByRole('dialog').locator('[data-mode="bul"]').click();
    await expect(page).toHaveURL(/\/oyun\/memleket\/bul\/karadeniz$/);
    await expect(page.getByText('Haritada bul', { exact: false }).first()).toBeVisible();
  });

  test('Haritada Bul: doğru cevap puan verir, yanlış cevap bilgi kartı açar', async ({ page }) => {
    await page.goto('/oyun/memleket/bul/marmara');
    await ready(page);
    await answerFind(page, true);
    await expect(page.getByLabel('İlerleme')).toHaveText('2/10', { timeout: 3000 });
    await expect(page.getByLabel('Puan')).not.toHaveText('0 puan');
    await answerFind(page, false);
    await expect(page.getByText(/^Doğru cevap:/)).toBeVisible();
    await expect(page.getByText('Kaynak: Vikipedi')).toBeVisible();
    await page.getByRole('button', { name: 'Devam' }).click();
    await expect(page.getByLabel('İlerleme')).toHaveText('3/10');
  });

  test('Hepsini Bitir: kapsamdaki her ili bulunca rekor kaydedilir', async ({ page }) => {
    await page.goto('/oyun/memleket/hepsi/marmara');
    await ready(page);
    for (let i = 0; i < 11; i++) {
      await answerFind(page, true);
      await page.waitForTimeout(350);
    }
    await expect(page.getByText('Tur bitti')).toBeVisible();
    await expect(page.getByText('Yeni kişisel rekor!')).toBeVisible();
    await page.goto('/istatistik');
    await expect(page.getByText('Marmara Bölgesi')).toBeVisible();
  });

  test('Bu Neresi?: tam tur sonuç ekranına ulaşır, istatistik ve öğrenme haritası güncellenir', async ({ page }) => {
    await page.goto('/oyun/memleket/neresi/ege');
    await ready(page);
    for (let i = 0; i < 12 && !(await page.getByText('Tur bitti').count()); i++) {
      const opt = page.locator('[data-option]:not([disabled])').first();
      if (await opt.count()) await opt.click();
      await page.waitForTimeout(300);
      const next = page.getByRole('button', { name: /Devam|Sonuçları gör/ });
      if (await next.count()) await next.click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByText('Tur bitti')).toBeVisible();
    await page.goto('/istatistik');
    await expect(page.locator('p', { hasText: /^1$/ }).first()).toBeVisible();
    // Öğrenme haritası: Ege illeri artık "görülmedi" değil
    await page.goto('/memleket/ege');
    await ready(page);
    await page.getByRole('button', { name: 'Öğrenme haritası' }).click();
    const classes = await page.$$eval('[data-g="ege"] path.unit', (els) => els.map((e) => e.getAttribute('class')));
    expect(classes.some((c) => /p-m\d/.test(c ?? ''))).toBe(true);
  });

  test('Yakın Atış: dokunulan nokta ile hedef arasına çizgi çizilir', async ({ page }) => {
    await page.goto('/oyun/cihan/yakin/tum');
    await ready(page);
    const box = (await page.locator('svg.map').boundingBox())!;
    await page.mouse.click(box.x + 40, box.y + box.height / 2);
    await expect(page.getByText(/km uzakta|Tam isabet/)).toBeVisible();
  });

  test('Günün Haritası: günde bir kez oynanır, paylaşım metni cevap içermez', async ({ page }) => {
    await page.goto('/gunluk/cihan');
    await ready(page);
    for (let i = 0; i < 25 && !(await page.getByText('Tur bitti').count()); i++) {
      const opt = page.locator('[data-option]:not([disabled])').first();
      if (await opt.count()) await opt.click();
      else {
        const box = (await page.locator('svg.map').boundingBox())!;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(300);
      const next = page.getByRole('button', { name: /Devam|Sonuçları gör/ });
      if (await next.count()) await next.click();
      await page.waitForTimeout(200);
    }
    const share = (await page.locator('pre').textContent())!;
    expect(share).toMatch(/^Cihan · Günün Haritası #\d+\n[🟩🟨🟥]{10}\n\d+\/10 · \d+ puan · \d+:\d\d$/u);
    // Tekrar girince soru değil sonuç gösterilir
    await page.goto('/gunluk/cihan');
    await expect(page.getByText('Tur bitti')).toBeVisible();
    await page.goto('/oyna');
    await expect(page.locator('[data-atlas="cihan"]').getByText(/puan|·/).first()).toBeVisible();
  });
});

test.describe('Çocuk Köşesi', () => {
  test('yapboz parçası yerine oturur; ebeveyn kilidi doğru cevapla açılır', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'telefon');
    await page.goto('/cocuk/yapboz/memleket');
    await page.waitForSelector('.kids-piece-wrap');
    const piece = (await page.locator('.kids-piece.active').boundingBox())!;
    const d = (await page.locator('.kids-piece.active').getAttribute('d'))!;
    const ghost = (await page.locator(`.kids-ghost[d="${d}"]`).boundingBox())!;
    const sx = piece.x + piece.width / 2;
    const sy = piece.y + piece.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(sx + ((ghost.x + ghost.width / 2 - sx) * i) / 12, sy + ((ghost.y + ghost.height / 2 - sy) * i) / 12);
    await page.mouse.up();
    await expect(page.locator('.kids-piece.placed')).toHaveCount(1);

    await page.goto('/cocuk');
    await page.getByRole('button', { name: /Büyükler/ }).click();
    const q = (await page.locator('#lock-title + p').textContent())!;
    const [a, b] = q.match(/\d+/g)!.map(Number);
    const wrong = page.getByRole('dialog').getByRole('button', { name: new RegExp(`^(?!${a + b}$)\\d+$`) }).first();
    await wrong.click();
    await expect(page.getByText('Bu soru büyükler için.')).toBeVisible();
    const q2 = (await page.locator('#lock-title + p').textContent())!;
    const [c, e] = q2.match(/\d+/g)!.map(Number);
    await page.getByRole('dialog').getByRole('button', { name: String(c + e), exact: true }).click();
    await expect(page).toHaveURL(/\/oyna$/);
  });
});

test.describe('PWA', () => {
  test('bir kez açıldıktan sonra çevrimdışı da açılır', async ({ page, context, isMobile }) => {
    test.skip(isMobile, 'bir kez yeterli');
    await page.goto('/memleket');
    await ready(page);
    await page.waitForFunction(async () => !!(await navigator.serviceWorker?.ready), null, { timeout: 15000 });
    // Önbellek dolsun
    await page.reload();
    await ready(page);
    await page.goto('/cihan');
    await ready(page);
    await context.setOffline(true);
    await page.goto('/oyun/cihan/bul/afrika');
    await ready(page);
    await expect(page.getByText('Haritada bul', { exact: false }).first()).toBeVisible();
    await context.setOffline(false);
  });
});
