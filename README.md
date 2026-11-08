# MIRROR AI — Frontend + Supabase Auth (v1.1)

نسخه‌ی اول MIRROR AI با طراحی Cinematic و رابط فارسی RTL، حالا امکان ثبت‌نام/ورود و ذخیره‌سازی خصوصی اطلاعات هر حساب را هم دارد.

## فایل‌ها
- `index.html` — رابط کاربری
- `style.css` — طراحی و استایل
- `app.js` — گفت‌وگو، مدیریت حافظه و اتصال حساب
- `supabase-config.js` — آدرس پروژه و کلید عمومی Supabase
- `supabase-schema.sql` — ساخت جدول و سیاست‌های امنیتی RLS

## راه‌اندازی Supabase

1. در [Supabase](https://supabase.com) یک پروژه بساز.
2. از Project Settings → API، مقدار Project URL و کلید `publishable` (یا کلید قدیمی `anon`) را بردار.
3. فایل `supabase-config.js` را باز کن و دو مقدار را جایگزین کن:

```js
window.MIRROR_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY"
};
```

4. در داشبورد Supabase وارد SQL Editor شو، محتوای کامل `supabase-schema.sql` را اجرا کن.
5. در Authentication → URL Configuration، آدرس سایت منتشرشده‌ات را به Site URL و Redirect URLs اضافه کن. برای تست محلی می‌توانی از آدرس لوکال سرور توسعه استفاده کنی.
6. پروژه را روی Cloudflare Pages منتشر کن و ثبت‌نام/ورود را آزمایش کن.

## امنیت
- در مرورگر فقط از `publishable` یا `anon` key استفاده کن؛ این کلیدها عمومی‌اند و امنیت داده‌ها با RLS اعمال می‌شود.
- هرگز `service_role` یا `secret` key را در این پروژه، فرانت‌اند یا مخزن Git قرار نده.
- جدول `mirror_user_state` فقط به کاربر واردشده اجازه می‌دهد ردیف متعلق به شناسه خودش را بخواند یا تغییر دهد.
- اگر تأیید ایمیل در Supabase فعال باشد، بعد از ثبت‌نام باید ایمیل را تأیید کنی و سپس وارد شوی.
- برای اطلاعات بسیار حساس یا محرمانه از نسخه آزمایشی استفاده نکن.

## وضعیت فعلی
- ثبت‌نام و ورود با ایمیل/رمز عبور: آماده پس از واردکردن تنظیمات Supabase و اجرای SQL.
- همگام‌سازی گفت‌وگوها، نشانه‌های شخصیتی و یادداشت‌ها: آماده با یک رکورد خصوصی برای هر کاربر.
- موتور پاسخ فعلی هنوز شبیه‌سازی محلی است و مدل AI واقعی نیست.
- مرحله بعد: ساخت Cloudflare Worker برای اتصال امن به مدل هوش مصنوعی؛ کلید مدل فقط به‌صورت Secret در Worker نگهداری می‌شود.

## اجرا
فایل‌ها را با یک وب‌سرور محلی یا Cloudflare Pages اجرا کن. برای تست ایمیل و callback، بازکردن مستقیم `file://` توصیه نمی‌شود.
