# PureBloodMD 🩺

Dating app parodi khusus dokter: swipe dokter di **Triage**, match, lalu chat di **Consults**.
Dibangun dengan Next.js 16, Tailwind v4 + **p441z style kit**, dan **Supabase** (auth, database, realtime chat, storage foto).

## Fitur (flow dari prototipe `belajar2.html`)

- **Triage**: 480 dokter di Indonesia (16 spesialisasi termasuk General Practitioner dan Medical Student, masing-masing 15 cewek + 15 cowok) plus 33 negara lain (tiap spesialisasi 1 cewek + 1 cowok per negara), filter gender, negara, **radar** (lokasi perangkat, dibulatkan ~1 km, orang lain cuma lihat jarak) dengan radius 5-100 km, spesialisasi, auskultasi detak jantung (suara), tombol discharge / defibrillate / stat consult, shortcut keyboard ← → ↑, modal "Code Pink" saat match.
- **Consults**: chat realtime + **kirim foto** (bucket privat, metadata/GPS dibuang, foto dari orang lain diblur sampai di-tap). Aturan **Bumble**: di match cewek x cowok, dokter cewek wajib chat duluan (dikunci di database). **Kuota 10 bubble** per percakapan, lalu paywall **VIP Rp 50.000** (mode demo, tidak ada pembayaran asli). Dokter bot otomatis membalas dengan jokes spesialisasinya.
- **Passport**: kredensial STR (privat), edit profil dengan preview kartu live, foto wajib, status VIP (bisa dimatikan), daftar dokter yang diblokir, dark mode, logout.
- **Keamanan**: **Report** (pelecehan seksual, foto eksplisit tanpa diminta, kekerasan verbal, ancaman, ujaran kebencian, profil palsu, scam, di bawah umur, kekhawatiran self-harm, lainnya) dan **Block** dari Triage maupun chat. Report otomatis ikut memblokir (bisa dimatikan). Laporan masuk ke tabel `reports` untuk ditinjau di Supabase Dashboard.
- **VIP berlangganan** (demo, tanpa pembayaran asli): Indonesia Rp 50.000/bulan, Rp 130.000/3 bulan, Rp 550.000/tahun; negara lain US$20/bulan, US$50/3 bulan, US$230/tahun. **Cancel subscription** = VIP tetap aktif sampai akhir periode yang sudah dibayar, lalu mati.
- **Unmatch** dan **Delete chat** (hapus riwayat untuk kedua pihak; kuota bubble tetap terhitung). **Consult tanpa pesan 30 hari otomatis terhapus** (pg_cron tiap jam). Foto chat yang terhapus dibersihkan dari storage dengan `npm run db:cleanup` (jadwalkan harian saat deploy).
- **Daftar aman**: CAPTCHA Cloudflare Turnstile, wajib setuju [Terms](/terms) & [Privacy](/privacy) + konfirmasi umur 21+ (versi Terms dan waktu persetujuan disimpan di akun). Email konfirmasi bergaya PureBloodMD (`supabase/templates/confirm-signup.html`).
- **Chat**: emoji picker, 12 stiker medis, kirim foto, dan peringatan otomatis kalau pesan terlihat berisi data pribadi (nomor HP, NIK, rekening, OTP, email).
- **Status online**: titik hijau di avatar (Realtime Presence; bot disimulasikan bergiliran tiap 30 menit).
- Setiap profil **wajib punya foto** (dicek di database dan di form).

## Setup Supabase (sekali saja)

1. **Buat tabel.** Buka Supabase Dashboard > SQL Editor > New query. Jalankan file di `supabase/migrations/` **berurutan**, satu per satu: `0001_init.sql`, `0002_vip_toggle.sql`, `0003_safety_media_radar.sql`, `0004_subscriptions_unmatch_expiry.sql`.
2. **Isi 420 dokter.** Pilih salah satu:
   - `npm run db:seed` (pakai `SUPABASE_SERVICE_ROLE_KEY` dari `.env.local`, hanya jalan di laptop kamu), atau
   - tempel isi `supabase/seed.sql` di SQL Editor, lalu Run.
3. **Isi key publik** di `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Project Settings > API Keys > publishable / anon>
   ```
   Jangan pernah taruh `service_role` di variabel `NEXT_PUBLIC_`.
4. **Auth > URL Configuration**: tambahkan `http://localhost:3333/auth/callback` ke Redirect URLs.
   (Opsional untuk testing cepat: Auth > Providers > Email, matikan "Confirm email".)

## Email konfirmasi & CAPTCHA

1. **Template email**: Supabase Dashboard > Authentication > Emails > Templates > **Confirm signup**. Subject: `Confirm your email to scrub in`. Body: isi `supabase/templates/confirm-signup.html`.
2. **Site URL**: Authentication > URL Configuration > Site URL = `http://localhost:3333` (ganti ke domain saat deploy). Link di email memakai `/auth/confirm?token_hash=...`, jadi tetap jalan walau email dibuka di HP lain.
3. **Pengiriman email**: SMTP bawaan Supabase dibatasi (kuota kecil per jam, hanya untuk testing). Untuk produksi pasang SMTP sendiri (mis. Resend) di Authentication > Emails > SMTP Settings.
4. **CAPTCHA**: `.env.local` berisi kunci TES Turnstile (selalu lolos, ada tulisan "For testing only"). Untuk produksi buat site di Cloudflare > Turnstile dan ganti kuncinya. Supaya API Supabase juga terlindungi langsung, aktifkan CAPTCHA di Authentication > Attack Protection dengan secret yang sama, lalu set `SUPABASE_AUTH_CAPTCHA=on`.

## PWA (install ke HP)

- Manifest: `src/app/manifest.ts`, ikon di `public/icons/` + `src/app/apple-icon.png`.
- Service worker: `public/sw.js` (aktif **hanya di production**: `npm run build && npm start`). Aset build di-cache, halaman publik bisa dibaca offline, halaman lain jatuh ke `public/offline.html`. Data pribadi (chat, profil, Supabase) tidak pernah di-cache.
- Install: Android/Chrome lewat tombol "Install app" di Passport; iPhone lewat Safari > Share > Add to Home Screen. HTTPS wajib saat deploy (localhost dikecualikan).

## Menjalankan

```bash
export PATH="$HOME/.local/node/bin:$PATH"   # Node 24 dipasang di ~/.local/node
npm install
npm run dev        # http://localhost:3333
```

## Struktur

```
supabase/migrations/0001_init.sql   skema, RLS, trigger Bumble + kuota, RPC swipe/inbox, realtime, storage
supabase/seed.sql | seed-doctors.json   420 dokter bot
src/proxy.ts                        refresh sesi Supabase + proteksi route
src/app/page.tsx                    landing
src/app/(auth)/                     login, signup
src/app/onboarding/                 bikin Doctor Passport
src/app/(app)/discover/             Triage (deck swipe)
src/app/(app)/chat/                 Consults (inbox + chat realtime)
src/app/(app)/passport/             profil & kredensial
src/components/ui, effects/         p441z style kit (disalin apa adanya)
docs/typography.md                  spec sheet tipografi (skala golden ratio)
```

Dibuat oleh Faiz Hazim Hawari · skill-typography
Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
