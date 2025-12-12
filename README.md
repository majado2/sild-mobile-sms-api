# sild-mobile-sms-api (Expo PoC)

عميل أندرويد بسيط (Expo + Dev Client) يقرأ رسالة SMS غير مرسلة من السيرفر ويرسلها تلقائيًا ثم يحدّث حالتها إلى `sent`.

## الإعداد السريع
- نسخة Node حديثة، Android SDK مفعّل، وجهاز أندرويد حقيقي للتجربة.
- ثبّت الاعتماديات: `npm install`.
- العنوان مثبت في الكود (`BASE_URL = https://slid.ethra2.com`) داخل `app/index.tsx`، عدّله فقط إذا تغيّر عنوان الـAPI.
  - `POLL_INTERVAL` (بالملي ثانية) الافتراضي 3000.

## بناء نسخة Native (مطلوب للمكتبة)
المكتبة `react-native-send-sms` قديمة ولا تدعم autolinking، لذا بعد كل `expo prebuild` تأكد من الخطوات الآتية:
1) إنشاء ملفات أندرويد: `npx expo prebuild`.
2) افتح `android/settings.gradle` وأضف:
   ```
   include ':react-native-send-sms'
   project(':react-native-send-sms').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-send-sms/android/app')
   ```
3) في `android/app/build.gradle` أضف داخل dependencies:
   ```
   implementation project(':react-native-send-sms')
   ```
4) في `android/app/src/main/java/.../MainApplication.java`:
   - أضف الاستيراد: `import com.someone.sendsms.SendSMSPackage;`
   - وأضف `new SendSMSPackage()` داخل قائمة الـ packages.
5) تأكد من وجود صلاحية الإرسال (أضفناها أيضًا في `app.json`):
   ```
   <uses-permission android:name="android.permission.SEND_SMS" />
   ```

> ملاحظة: تشغيل `expo prebuild --clean` يعيد توليد مجلد android، وأي تعديلات يدويّة يجب إعادة تطبيقها.

## التشغيل
1) `npx expo prebuild`
2) (بعد ربط المكتبة كما أعلاه) شغّل على أندرويد: `npx expo run:android`
3) عند التشغيل:
   - زر **Start** يبدأ حلقة الاستقصاء كل 3 ثوان.
   - زر **Stop** يوقفها.
   - الحالة الحالية وآخر رسالة تظهر في نفس الشاشة.

## منطق العمل
- يستدعي `GET /sms/pending` ليجلب رسالة واحدة غير مرسلة.
- يرسل SMS برقم المستلم ومحتوى الرسالة عبر `react-native-send-sms`.
- عند نجاح الإرسال يطلب `POST /sms/{id}/sent`.
- لا يتم التحقق من وصول الرسالة للمستلم (PoC فقط).

## ملاحظات
- التطبيق أندرويد فقط ولا يعمل على iOS أو Emulator للإرسال الفعلي.
- يجب قبول صلاحية `SEND_SMS` عند أول إرسال.
- التوقف ممكن إذا أُغلق التطبيق من الخلفية (تطبيق تجريبي قصير العمر).
