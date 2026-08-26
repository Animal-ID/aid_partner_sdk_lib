# Changelog

Усі суттєві зміни пакетів цього монорепозиторію (`@animal-id/partner-core`, `-react`,
`-vue`, `-angular`, `-nestjs`) документуються в цьому файлі. Пакети версіонуються разом.

Формат базується на [Keep a Changelog](https://keepachangelog.com/uk/1.1.0/),
а версіонування — на [Semantic Versioning](https://semver.org/lang/uk/).

## [Unreleased]

## [0.5.0] — 2026-08-27

### Added

- **Площина заведення** — новий `PlatformClient` (`@animal-id/partner-core`), окремий від `AnimalIdClient`, бо це окремий ключ. На сервері площини — різні групи маршрутів, які резолвлять різні типи застосунку: ключ платформи на `/v1/partner/` віддає `401`, і навпаки. Два клієнти замість одного — щоб їх не можна було переплутати й щоб ключ платформи не потрапив у браузерний бандл.
  - `clinics.search()` / `clinics.provision()` — знайти клініку, яка вже є, перш ніж створювати другу її копію. `Clinic.linked` каже, чи вона ваша. Стабільний `external_org_id` робить повторну реєстрацію безпечною.
  - `doctors.seat()` — завести лікаря в клініку і отримати його ключ. **Приватна половина повертається один раз.**
  - `doctors.credentials()` — забрати креденшели лікаря, який уже є в Animal-ID і **погодився** на передачу. Ключ належить вам і відділений від власного ключа лікаря: коли він відкликає дозвіл, ваш перестає працювати, а його — ні.
  - `consents.requestKeyHandover()` / `requestClinicMembership()` / `request()` / `status()`. Повторний запит повертає вже відкритий, а не створює другий.
  - Хелпери `isConsentUsable()` (дозвіл має строк — статус `approved` сам по собі ще не право діяти) та `isConsentFinished()`.
- **Вебхуки `consent.approved` / `.denied` / `.revoked` / `.expired`** із type guard `isConsentEvent()` і типом `ConsentWebhookResult` (тільки публічні ідентифікатори).
  - Обробляйте `consent.revoked`: відкликання може статися через місяці, ключ помирає тієї ж миті, і без події ви дізнаєтесь про це аж коли впаде наступний виклик.
  - `expired` ≠ `denied`: ніхто не відмовляв, ніхто не глянув. Можна спитати ще раз.
- `@animal-id/partner-nestjs`: `AnimalIdPlatformService` та `AnimalIdModule.forPlatform()` / `forPlatformAsync()` — окрема реєстрація, бо окремий ключ; помилка інʼєкції ловиться на компіляції, а не рантаймовим `401`.

### Notes

- React, Vue і Angular **навмисно не отримали** `PlatformClient`: ключ платформи заводить акаунти й видає креденшели, і в браузерному бандлі йому не місце. Використовуйте його з NestJS, route handler у Next.js або будь-якого іншого сервера.

## [0.4.0] — 2026-08-25

### Added

- Ваш власний ідентифікатор власника: поле `external_owner_id` приймається у `CreateOwnerInput` та `AnimalOwnerInput` (inline-власник при реєстрації тварини) і повертається у `Owner.external_owner_id` та `AnimalOwnerExpanded.external_owner_id` — у `owners.create()`, `owners.search()` і в розгортанні `owners` на картці тварини.
  - Записується **один раз**, при першому контакті, і ніколи не перезаписується.
  - **Ізольований по інтеграції**: партнер бачить лише той id, який передав сам, і ніколи не бачить id іншого партнера для тієї ж людини.

## [0.3.0] — 2026-07-07

### Added

- Поле `public_id` у типах власника: `Owner.public_id` та `AnimalOwnerExpanded.public_id` — стабільний публічний ідентифікатор власника, що повертається у `owners.create()`, `owners.search()` та в розгортанні `owners` на картці тварини.
- Прив'язка наявного власника при реєстрації тварини за `public_id`: `AnimalOwnerInput` тепер приймає `public_id` (поряд із режимом `user_gid` та inline-реєстрацією за email/phone).

### Changed

- SDK за замовчуванням надсилає версію API `2026-07-04` (`version` у конфізі клієнта, заголовок `X-Eternity-Animal-ID-Version`) — з цієї версії власник у реєстрації прив'язується за `public_id` замість `user_gid`. Щоб зберегти попередню поведінку, задайте `version` явно (напр. `'2026-05-30'`).

## [0.2.0] — 2026-07-02

### Added

- Запити доступу до тварини (`requestAccess`, `accessStatus`) і прапорці доступу на картці (`abilities.can_edit`).
- Розгортання `owners` у пошуку тварин (`expand: ['owners']`).
- Прийом і перевірка підпису вебхуків для подій `animal_access.*`.

### Changed

- Результат `POST /animals/{id}/procedures` типізовано як partner-картку процедури (як у `GET`).

## [0.1.0]

### Added

- Перший реліз: framework-agnostic ядро (`@animal-id/partner-core`) з HMAC-SHA256-підписом і типізованим клієнтом, а також адаптери для React, Vue, Angular та NestJS.
