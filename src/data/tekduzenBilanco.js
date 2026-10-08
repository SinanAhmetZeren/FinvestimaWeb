// Aşağıdaki liste, metindeki tüm hesaplar içerisinden sadece bilançoda görünen kalemleri
// içerir (Gelir Tablosu 6'lı, Maliyet 7'li, Serbest 8'li ve Nazım 9'lu hesaplar elenmiştir).
export const bilanco_hesapları_filtreli = `1. DÖNEN VARLIKLAR
10. Hazır Değerler
100. Kasa
101. Alınan Çekler
102. Bankalar
103. Verilen Çek.ve Öde.Emirleri(-)
108. Diğer Hazır Değerler
11. Menkul Kıymetler
110. Hisse Senetleri
111. Özel Kesim Tahvil, Senet ve Bonoları
112. Kamu Kesimi Tahvil, Senet ve Bonoları
118. Diğer Menkul Kıymetler
119. Menkul Kıymetler Değer Düşüklüğü Karşılığı(-)
12. Ticari Alacaklar
120. Alıcılar
121. Alacak Senetleri
122. Alacak Senetleri Reeskontu(-)
124. Kazanılmamış Finansal Kiralama Faiz Gelirleri(-)
126. Verilen Depozito ve Teminatlar
127. Diğer Ticari Alacaklar Senet ve Bonoları
128. Şüpheli Ticari Alacaklar
129. Şüpheli Ticari Alacaklar Karşılığı(-)
13. Diğer Alacaklar
131. Ortaklardan Alacaklar
132. İştiraklerden Alacaklar
133. Bağlı Ortaklıklardan Alacaklar
135. Personelden Alacaklar
136. Diğer Çeşitli Alacaklar
137. Diğer Alacak Senetleri Reeskontu(-)
138. Şüpheli Diğer Alacaklar
139. Şüpheli Diğer Alacaklar Karş. (-)
15. Stoklar
150. İlk Madde ve Malzeme
151. Yarı Mamuller - Üretim
152. Mamuller
153. Ticari Mallar
157. Diğer Stoklar
158. Stok Değer Düşüklüğü Karşı(-)
159. Verilen Sipariş Avansları
17. Yıllara Yaygın İnşaat ve Onarım Maliyetleri
170. Yıllara Yaygın İnşaat ve Onarım Maliyetleri
178. Yıllara Yaygın İnşaat Enflasyon Düzeltme
179. Taşeronlara Verilen Avanslar
18. Gelecek Aylara Ait Giderler ve Gelir Tahakkukları
180. Gelecek Aylara Ait Giderler
181. Gelir Tahakkukları
19. Diğer Dönen Varlıklar
190. Devreden KDV
191. İndirilecek KDV
192. Diğer KDV
193. Peşin Ödenen Vergiler ve Fonlar
195. İş Avansları
196. Personel Avansları
197. Sayım ve Tesellüm Noksanlar
198. Diğer Çeşitli Dönen Varlıklar
199. Diğer Dönen Varlık.Karşılığı(-)
2. DURAN VARLIKLAR
22. Ticari Alacaklar
220. Alıcılar
221. Alacak Senetleri
222. Alacak Senetleri Reeskontu(-)
224. Kazanılmamış Finansal Kiralama Faiz Gelirleri(-)
226. Verilen Depozito ve Teminatlar
229. Şüpheli Alacaklar Karşılığı(-)
23. Diğer Alacaklar
231. Ortaklardan Alacaklar
232. İştiraklerden Alacaklar
233. Bağlı Ortaklıklardan Alacaklar
235. Personelden Alacaklar
236. Diğer Çeşitli Alacaklar
237. Diğer Alacak Senet.Reeskontu(-)
239. Şüpheli Diğer Alacaklar Karşılığı(-)
24. Mali Duran Varlıklar
240. Bağlı Menkul Kıymetler
241. Bağlı Menkul Kıymetler Değer Düşüklüğü Karşılığı(-)
242. İştirakler
243. İştiraklere Sermaye Taahhütleri(-)
244. İştirakler Sermaye Payları Değer Düşüklüğü Karşılığı(-)
245. Bağlı Ortaklıklar
246. Bağlı Ortaklıklara Sermaye Taahhütleri(-)
247. Bağlı Ortaklıklar Sermaye Payları Değer Düşüklüğü Karşılığı(-)
248. Diğer Mali Duran Varlıklar
249. Diğer Mali Duran Varlıklar Karşılığı(-)
25. Maddi Duran Varlıklar
250. Arazi ve Arsalar
251. Yeraltı ve Yerüstü Düzenleri
252. Binalar
253. Tesis, Makine ve Cihazlar
254. Taşıtlar
255. Demirbaşlar
256. Diğer Maddi Duran Varlıklar
257. Birikmiş Amortismanlar(-)
258. Yapılmakta Olan Yatırımlar
259. Verilen Avanslar
26. Maddi Olmayan Duran Varlıklar
260. Haklar
261. Şerefiye
262. Kuruluş ve Örgütlenme Giderleri
263. Araştırma ve Geliştirme Giderleri
264. Özel Maliyetler
267. Diğer Maddi Olmayan Duran Varlıklar
268. Birikmiş Amortismanlar(-)
269. Verilen Avanslar
27. Özel Tükenmeye Tabi Varlıklar
271. Arama Giderleri
272. Hazırlık ve Geliştirme Giderleri
277. Diğer Özel Tükenmeye Tabi Varlıklar
278. Birikmiş Tükenme Payları(-)
279. Verilen Avanslar
28. Gelecek Yıllara Ait Giderler ve Gelir Tahakkukları
280. Gelecek Yıllara Ait Giderler
281. Gelir Tahakkukları
29. Diğer Duran Varlıklar
291. Gelecek Yıllarda İndirilecek KDV
292. Diğer KDV
293. Gelecek Yıllar İhtiyacı Stoklar
294. Elden Çıkarılacak Stoklar ve Maddi Duran Varlıklar
295. Peşin Ödenen Vergiler ve Fonlar
297. Diğer Çeşitli Duran Varlıklar
298. Stok Değer Düşüklüğü Karşı. (-)
299. Birikmiş Amortismanlar(-)
3. KISA VADELİ YABANCI KAYNAKLAR
30. Mali Borçlar
300. Banka Kredileri
301. Finansal Kiralama İşlemlerinden Borçlar
302. Ertelenmiş Finansal Kiralama Borçlanma Maliyetleri(-)
303. Uzun Vadeli Kredilerin Anapara Taksitleri ve Faizleri
304. Tahvil Anapara Borç, Taksit ve Faizleri
305. Çıkarılmış Bonolar ve Senetler
306. Çıkarılmış Diğer Menkul Kıymetler
308. Menkul Kıymetler İhraç Farkları(-)
309. Diğer Mali Borçlar
32. Ticari Borçlar
320. Satıcılar
321. Borç Senetleri
322. Borç Senetleri Reeskontu(-)
326. Alınan Depozito ve Teminatlar
329. Diğer Ticari Borçlar
33. Diğer Borçlar
331. Ortaklara Borçlar
332. İştiraklere Borçlar
333. Bağlı Ortaklıklara Borçlar
335. Personele Borçlar
336. Diğer Çeşitli Borçlar
337. Diğer Borç Senetleri Reeskontu(-)
34. Alınan Avanslar
340. Alınan Sipariş Avansları
349. Alınan Diğer Avanslar
35. Yıllara Yaygın İnşaat ve Onarım Hakedişleri
350. Yıllara Yaygın İnşaat ve Onarım Hakedişleri
358. Yıllara Yaygın İnşaat Enflasyon Düzeltme
36. Ödenecek Vergi ve Diğer Yükümlülükler
360. Ödenecek Vergi ve Fonlar
361. Ödenecek Sosyal Güvenlik Kesintileri
368. Vadesi Geçmiş, Erte.veya Taksi.Vergi ve Diğ.Yüküm.
369. Ödenecek Diğer Yükümlülükler
37. Borç ve Gider Karşılıkları
370. Dönem Karı Vergi ve Diğer Yasal Yükümlülük Karşılıkları
371. Dönem Karının Peşin Ödenen Vergi ve Diğer Yükümlülükleri(-)
372. Kıdem Tazminatı Karşılığı
373. Maliyet Giderleri Karşılığı
379. Diğer Borç ve Gider Karşılıkları
38. Gelecek Aylara Ait Gelirler ve Gider Tahakkukları
380. Gelecek Aylara Ait Gelirler
381. Gider Tahakkukları
39. Diğer Kısa Vadeli Yabancı Kaynaklar
391. Hesaplanan KDV
392. Diğer KDV
393. Merkez ve Şubeler Cari Hesabı
397. Sayım ve Tesellüm Fazlaları
399. Diğer Çeşitli Yabancı Kaynaklar
4. UZUN VADELİ YABANCI KAYNAKLAR
40. Mali Borçlar
400. Banka Kredileri
401. Finansal Kiralama İşlemlerinden Borçlar
402. Ertelenmiş Finansal Kiralama Borçlanma Maliyetleri(-)
405. Çıkarılmış Tahviller
407. Çıkarılmış Diğer Menkul Kıymetler
408. Menkul Kıymetler İhraç Farkı(-)
409. Diğer Mali Borçlar
42. Ticari Borçlar
420. Satıcılar
421. Borç Senetleri
422. Borç Senetleri Reeskontu(-)
426. Alınan Depozito ve Teminatlar
429. Diğer Ticari Borçlar
43. Diğer Borçlar
431. Ortaklara Borçlar
432. İştiraklere Borçlar
433. Bağlı Ortaklıklara Borçlar
436. Diğer Çeşitli Borçlar
437. Diğer Borçlar Senetleri Reeskontu. (-)
438. Kamuya Olan Ertelenmiş veya Taksitlendirilmiş Borçlar
44. Alınan Avanslar
440. Alınan Sipariş Avansları
449. Alınan Diğer Avanslar
47. Borç ve Gider Karşılıkları
472. Kıdem Tazminatı Karşılığı
479. Diğer Borç ve Gider Karşılıkları
48. Gelecek Yıllara Ait Gelirler ve Gider Tahakkukları
480. Gelecek Yıllara Ait Gelirler
481. Gider Tahakkukları
49. Diğer Uzun Vadeli Yabancı Kaynaklar
492. Gelecek Yıllara Ertelenen veya Terkin Edilecek Katma Değer Vergisi
493. Tesise Katılma Payları
499. Diğer Çeşitli Uzun Vadeli Yabancı Kaynaklar
5. ÖZ KAYNAKLAR
50. Ödenmiş Sermaye
500. Sermaye
501. Ödenmemiş Sermaye(-)
502. Sermaye Düzeltmesi Olumlu Farkları
503. Sermaye Düzeltmesi Olumsuz Farkları(-)
52. Sermaye Yedekleri
520. Hisse Senedi İhraç Primleri
521. Hisse Senedi İptal Karları
522. MDV Yeniden Değerleme Artışları
523. İştirakler Yeniden Değerleme Artışları
524. Maliyet Artışları Fonu
529. Diğer Sermaye Yedekleri
54. Kar Yedekleri
540. Yasal Yedekler
541. Statü Yedekleri
542. Olağanüstü Yedekler
548. Diğer Kar Yedekleri
549. Özel Fonlar
57. Geçmiş Yıllar Karları
570. Geçmiş Yıllar Karları
58. Geçmiş Yıllar Zararları
580. Geçmiş Yıllar Zararları(-)
59. Dönem Net Karı(Zararı)
590. Dönem Net Karı
591. Dönem Net Zararı(-)`;
