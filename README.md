# Sakara

Undangan digital pernikahan. Satu undangan, dipadu untuk setiap tamu.

- Frontend: satu file `index.html` (tanpa build step), di-hosting di Vercel.
- Backend: Supabase (Postgres, Auth email OTP, Storage foto, Realtime) + fungsi serverless Vercel di `api/`.
- Pembayaran: Midtrans Snap (QRIS, Virtual Account, e-wallet) dengan webhook `api/pay/notify`.

Tanpa variabel lingkungan, website berjalan dalam **mode demo** (data di browser, pembayaran simulasi).

## Setup

1. **Supabase** → buat proyek (region Singapore) → SQL Editor → jalankan `supabase/schema.sql`.
2. Supabase → Authentication → Email Templates → *Magic Link*: tambahkan kode `{{ .Token }}` agar email berisi 6 angka.
3. Supabase → Authentication → URL Configuration → Site URL = alamat Vercel.
4. **Vercel** → Project → Settings → Environment Variables:

| Variabel | Isi |
| --- | --- |
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (rahasia) |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans (rahasia) |
| `MIDTRANS_CLIENT_KEY` | Client key Midtrans |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox |
| `SITE_URL` | opsional, mis. `https://satupadukita.vercel.app` |

5. **Midtrans** → Settings → Payment → Notification URL = `https://<domain>/api/pay/notify`.
6. Redeploy di Vercel.

## Alamat penting

- Undangan tamu: `/u/<slug>?to=<KODE>`
- Penerima tamu: `/u/<slug>/checkin?pin=<PIN>`
