# Methalox ORSC Roket Motoru Simülatörü — Proje Özeti

Bu dosya, `rocket-engine-simulator` projesinde yapılan çalışmaları tek yerde özetler.

## Ortaya çıkan uygulama

Yaklaşık 100 kN vakum itki sınıfında, LOX–metan kullanan ve oksijence zengin kademeli yanma çevrimini eğitim amacıyla gösteren yerel bir uygulama geliştirildi. Uygulama iki ana bölümden oluşur:

- FastAPI ve Pydantic tabanlı Python hesaplama motoru
- React, TypeScript ve Three.js tabanlı etkileşimli 3B arayüz

Python katmanı bütün mühendislik değerlerinin tek kaynağıdır. Arayüz kendi başına basınç, debi, sıcaklık veya performans değeri üretmez; hesaplanmış durumu REST API üzerinden alır.

## Modellenen akış yolları

LOX yolu tanktan başlayarak filtre, ana vana, besleme hattı, booster pompa, ana turbopompa ve yüksek basınç manifolduna ilerler. Ana kol enjektöre gider. Kontrollü küçük kol ayrı bir ön yanma odası basınç yükseltme kademesi ve kontrol vanasından geçerek oksijence zengin ön yanma odasına ulaşır.

Metan yolu tank, filtre, ana yakıt vanası, booster pompa, ana turbopompa ve manifolddan sonra ikiye ayrılır. Ana kol rejeneratif soğutma kanallarında nozül ucundan yanma odasına doğru ilerler, ısınır ve yakıt enjektörüne döner. Küçük kol ön yanma odası kontrol vanasına gider.

Ön yanma odasından çıkan sıcak ve oksijence zengin gaz türbini sürer. Türbin ortak mil üzerinden ana pompaları ve yardımcı booster kademelerini besler. Türbin egzozu dışarı atılmaz; sıcak gaz enjektöründen ana yanma odasına döner ve toplam kütle debisine yalnızca bir kez dahil edilir.

Ayrı helyum/inert gaz beslemesi, purge vanası ve seçili hatlara giden purge yolları gösterilir. Ön yanma odası ve ana yanma odası ateşleyicileri yalnızca ilgili ateşleme evrelerinde etkinleşir; kararlı durumda kapanır.

## Python mühendislik modeli

Model aşağıdaki hesapları modüler işlevlerle yapar:

- Toplam kütle debisi ve O/F bazlı LOX–metan ayrımı
- Ana ve ön yanma odası akış kollarının kütle dengesi
- Kv ve vana açıklığına bağlı sıvı vana kaybı
- Darcy–Weisbach tabanlı eşdeğer boru kaybı
- Booster ve ana pompaların basınç yükseltmesi ile mil gücü
- Rejeneratif soğutma basınç kaybı ve öngörülmüş ısı alımı
- Oksijence zengin ön yanma odasının basitleştirilmiş enerji durumu
- Türbin kapasitesi ve tüm pompaları kapsayan mil gücü dengesi
- Ana enjektör basınç marjı ve açıkça gösterilen artık basınç metering kademesi
- Sabit gama izentropik vakum nozülü, c-star yaklaşımı, Isp ve itki
- Fiziksel tutarsızlıkları bileşenlerle ilişkilendiren doğrulama uyarıları

Nominal tasarım sonucu yaklaşık olarak şöyledir:

| Büyüklük | Sonuç |
|---|---:|
| Vakum itkisi | 100 kN |
| Yanma odası basıncı | 100 bar |
| Karışım oranı | 3,4 O/F |
| Vakum özgül itkisi | 359 s |
| Toplam debi | 28,38 kg/s |
| LOX debisi | 21,93 kg/s |
| Metan debisi | 6,45 kg/s |
| LOX ana pompa çıkışı | 145 bar |
| Metan ana pompa çıkışı | 150 bar |
| Ana enjektör giriş/çıkış basıncı | 120 / 100 bar |
| Pompa güç ihtiyacı | 829 kW |
| Türbin güç kapasitesi | 1.366 kW |

Kullanıcı fiziksel olarak tutarsız bir değer girdiğinde model görünüşte makul bir sonuç uydurmaz. İstenen çalışma noktası gösterilmeye devam eder, fakat uygulanabilir olmadığı belirtilir ve ilgili 3B dallar pembe/kırmızı renkle vurgulanır.

## Etkileşimli 3B arayüz

3B sahnede tanklar, borular, filtreler, vanalar, booster pompalar, ana turbopompalar, türbin, ortak mil, ön yanma odası, rejeneratif soğutma spirali, enjektörler, ana yanma odası, boğaz, nozül, egzoz alevi ve purge sistemi bulunur.

Arayüz şu yetenekleri içerir:

- Fareyle 360° döndürme, yakınlaştırma ve pan
- Kamera sıfırlama ve sol tuşla pan modu
- Bileşen üzerine gelince anlık bilgi kartı
- Bileşene tıklayınca kalıcı inceleme paneli
- Cutaway, katı gövde, exploded ve şeffaf/yalnız akış yolu görünümleri
- LOX, metan, sıcak gaz ve purge yollarını ayrı gösterme
- LOX, metan veya sıcak gazı hareketli işaretçi ve kamerayla takip etme
- Debiye göre parçacık sayısı/hızı; çalışma durumuna göre pompa, türbin ve mil dönüşü
- Vana açıklık göstergeleri, soğutma boyunca renk değişimi ve gaz/alev animasyonu
- Beginner ve Engineering arayüz modları
- Masaüstü, dar pencere ve mobil boyutlar için uyarlanabilir yerleşim

## Çalışma zaman çizelgesi

Uygulama şu dokuz aşamayı gösterir:

1. Safe / idle
2. Purge
3. Pump spin-up
4. Preburner ignition
5. Main-chamber ignition
6. Ramp to nominal thrust
7. Steady state
8. Controlled shutdown
9. Post-shutdown purge

Başlat, duraklat, sıfırla, zaman çizelgesinde sürükle ve 0,5×/1×/2× hız seçenekleri uygulanmıştır. Bu geçişler eğitim amaçlı öngörülmüş interpolasyonlardır; korunum denklemlerini çözen gerçek bir geçici rejim simülasyonu veya operasyon prosedürü değildir.

## Kullanıcı tarafından değiştirilebilen girdiler

`backend/data/engine_config.yaml` dosyasındaki bütün alanlar arayüzde de otomatik olarak oluşturulur. Bunlara oda basıncı, hedef itki, throttle, O/F, tank basınçları, yoğunluklar, boru çap/uzunlukları, pompa basınçları ve verimleri, türbin verimi, vana Kv değerleri/açıklıkları, filtre ve soğutma kayıpları, enjektör kaybı, ön yanma odası akış oranları, nozül genişleme oranı ve zaman çizelgesi süreleri dahildir.

`Apply Changes` yalnızca tarayıcı oturumunu günceller; YAML dosyasını değiştirmez. `Reset to nominal` YAML değerlerini yeniden okur.

## Doğrulama

- Python model ve API testleri: 16 test geçti.
- TypeScript kontrolü ve üretim derlemesi geçti.
- Tek süreçli `python app.py` başlatması doğrulandı.
- 3B sahne yükleme, döndürme, zoom, pan ve kamera sıfırlama doğrulandı.
- Hover ve tıklayarak bileşen inceleme doğrulandı.
- 130 bar oda basıncında yetersiz enjektör marjı uyarısı doğrulandı.
- %60 throttle değerinde 60 kN, 60 bar ve yaklaşık 17,03 kg/s güncellemesi doğrulandı.
- Tüm başlangıç, kararlı çalışma, kontrollü kapanış ve son purge aşamaları doğrulandı.
- Exploded, şeffaf, akış izolasyonu ve hareketli akış takibi doğrulandı.
- Mobil görünüm 390 × 844 pikselde kontrol edildi.

Ayrıntılı kayıt `VERIFICATION.md`, kurulum ve teknik açıklamalar `README.md` içindedir.

## Çalıştırma

Bu bilgisayarda proje klasöründeki `run.cmd` dosyasına çift tıklanabilir. Alternatif olarak proje klasöründe:

```powershell
.\.venv\Scripts\python.exe app.py
```

Ardından `http://127.0.0.1:8000` açılır.

Başka bir bilgisayarda ilk kurulum, geliştirme komutları, REST API, yeni bileşen ekleme ve ileride Cantera/NASA CEA, gerçek akışkan özellikleri veya pompa haritaları bağlama adımları `README.md` içinde açıklanmıştır.

## Kullanım sınırı

Bu çalışma yalnızca eğitim, yazılım inceleme ve nitel hassasiyet analizi içindir. Doğrulanmış motor tasarımı, üretim resmi, ateşleme/test prosedürü, uçuş modeli veya güvenlik analizi değildir. Gerçek vana karakteristikleri, NPSH/kavitasyon, deneysel pompa ve türbin haritaları, ayrıntılı enjektör ve kararlılık analizi, kriyojenik gerçek akışkan özellikleri, kimyasal denge/kinetik, ısıl-yapısal analiz, CFD ve deneysel doğrulama modele dahil değildir.
