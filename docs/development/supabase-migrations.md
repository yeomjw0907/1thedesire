# Supabase 마이그레이션 동기화

배포 전에 **로컬 마이그레이션**과 **원격 DB 적용 상태**가 일치하는지 확인하는 절차입니다.

---

## 1. 로컬 마이그레이션 파일 목록

로컬 마이그레이션은 `supabase/migrations/` 폴더의 `*.sql` 파일입니다.  
파일명(또는 파일명에서 추출한 버전) 기준으로 순서가 정해집니다.

- `202602280001_extensions_and_helpers.sql`
- `202602280002_create_profiles.sql`
- `202602280003_create_posts.sql`
- `202602280004_create_blocks.sql`
- `202602280005_create_chat_rooms.sql`
- `202602280006_create_consent_events.sql`
- `202602280007_create_messages.sql`
- `202602280008_create_point_transactions.sql`
- `202602280009_create_payment_events.sql`
- `202602280010_create_reports.sql`
- `202602280011_create_moderation_actions.sql`
- `202602280013_enable_rls.sql`
- `202602280014_profiles_policies.sql`
- `202602280015_posts_policies.sql`
- `202602280016_chat_and_messages_policies.sql`
- `202602280017_points_reports_admin_policies.sql`
- `202602280018_storage_post_images.sql`
- `202603010001_add_posts_tags.sql`
- `202603010101_create_sti_verification_tables.sql`
- `202603010102_create_sti_verification_storage.sql`
- `202603010103_create_sti_verification_policies.sql`
- `202603020001_create_rpc_debit_points.sql`
- `202603020002_create_rpc_complete_signup.sql`
- `202603020003_add_admin_role.sql`
- `202603020004_fix_public_sti_badges_security_invoker.sql`
- `202603030001_add_likes.sql`
- `202603030002_add_notifications.sql`
- `202603040001_add_image_url_2.sql`
- `202603050001_add_profiles_withdrawn_at.sql`
- `202603060001_fix_sti_reviewer_fk_to_auth_users.sql`

(새 마이그레이션을 추가하면 이 목록에 반영해 두세요.)

---

## 2. 원격 적용 목록 확인

### Supabase 대시보드

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **SQL Editor**에서 다음 쿼리 실행:

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

결과에 나온 `version` / `name`이 원격에 **이미 적용된** 마이그레이션입니다.

### Supabase CLI (로컬에 설치된 경우)

```bash
supabase db remote commit
```

원격과 로컬 차이를 확인할 때 사용합니다.  
원격에만 적용된 마이그레이션이 있으면 로컬로 가져오고, 로컬에만 있는 건 수동으로 원격에 적용해야 합니다.

### Cursor / MCP

Supabase MCP의 `list_migrations` 도구에 `project_id`를 넘겨 원격 적용 목록을 조회할 수 있습니다.  
로컬 `supabase/migrations/*.sql` 파일명과 비교해 누락된 항목이 있는지 확인하세요.

---

## 3. 배포 전 체크리스트

- [ ] **원격에 미적용 마이그레이션이 있으면 먼저 적용 후 배포**
  - 로컬에는 있는데 위 절차로 확인한 원격 목록에 없는 마이그레이션이 있으면, Supabase 대시보드 **SQL Editor**에서 해당 `.sql` 내용을 실행하거나, MCP `apply_migration` 등으로 적용한 뒤 배포하세요.
- [ ] 적용 후에는 원격 목록을 다시 한 번 확인해, 필요한 마이그레이션이 모두 적용되었는지 검증하는 것이 좋습니다.

로컬과 원격이 어긋나 있으면(예: 앱 코드는 `profiles.withdrawn_at`을 쓰는데 원격 DB에는 해당 컬럼이 없는 경우) 쿼리 오류로 화면이 빈 것처럼 보일 수 있으므로, 배포 전 동기화를 습관화하는 것을 권장합니다.
