import { expect, test } from '@playwright/test';

// Hesap akışı: misafir durumu olmadan başla
test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: 'reduce' });

test('kullanıcı adıyla giriş, tur puanı sunucuya gider, sıralamada kendi adını görür; başka cihazda puanlar durur', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'bir kez yeterli');
  const ad = `Seyyah${Date.now() % 100000}`;
  await page.goto('/oyna');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Hoş geldin, seyyah!')).toBeVisible();
  await dialog.getByLabel('Kullanıcı adı').fill(ad);
  await dialog.getByLabel('4 haneli şifre').fill('1234');
  await dialog.getByRole('button', { name: 'Devam' }).click();
  await expect(dialog.getByText(`“${ad}” adı boşta`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Evet, bu adla başla' }).click();
  await expect(page.getByText(`Aramıza hoş geldin, ${ad}!`)).toBeVisible();
  await expect(page.getByText(`Merhaba, ${ad}`)).toBeVisible();

  // Bir tur oyna (Burası Neresi?, hep ilk şık)
  await page.goto('/oyun/memleket/neresi/ege');
  await page.waitForSelector('[data-option]');
  for (let i = 0; i < 12 && !(await page.getByText('Tur bitti').count()); i++) {
    const opt = page.locator('[data-option]:not([disabled])').first();
    // İnsan hızı: sunucu soru başına 0,6 sn'den hızlı turları reddeder
    await page.waitForTimeout(700);
    if (await opt.count()) await opt.click();
    await page.waitForTimeout(250);
    const next = page.getByRole('button', { name: /Devam|Sonuçları gör/ });
    if (await next.count()) await next.click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByText('Tur bitti')).toBeVisible();
  await page.waitForTimeout(800);

  // Sıralama: kendi adı ve "SEN" işareti
  await page.goto('/istatistik');
  await page.getByRole('tab', { name: 'Tüm zamanlar' }).click();
  const me = page.locator('li[aria-current="true"]');
  await expect(me).toContainText(ad);
  await expect(me).toContainText('SEN');
  await expect(page.getByText(/seyyah keşifte|tek seyyah sensin/)).toBeVisible();
  const puan = await page.locator('section').filter({ hasText: ad }).first().textContent();

  // Başka cihaz: boş tarayıcı, aynı ad (küçük harf), aynı şifre
  const other = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await other.goto('/oyna');
  const d2 = other.getByRole('dialog');
  await d2.getByLabel('Kullanıcı adı').fill(ad.toLowerCase());
  await d2.getByLabel('4 haneli şifre').fill('1234');
  await d2.getByRole('button', { name: 'Devam' }).click();
  await expect(other.getByText(`Tekrar hoş geldin, ${ad}!`)).toBeVisible();
  await other.goto('/istatistik');
  await expect(other.getByText(/İstatistiklerim/)).toBeVisible();
  // İlerleme de geldi: cevaplanan soru sayısı 0 değil
  await expect(other.locator('p', { hasText: /^\d+\/\d+$/ }).first()).not.toHaveText('0/0');
  void puan;

  // Yanlış şifre
  const third = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await third.goto('/oyna');
  const d3 = third.getByRole('dialog');
  await d3.getByLabel('Kullanıcı adı').fill(ad);
  await d3.getByLabel('4 haneli şifre').fill('9999');
  await d3.getByRole('button', { name: 'Devam' }).click();
  await expect(d3.getByRole('alert')).toContainText('şifre eşleşmedi');
});
