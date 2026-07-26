import { z } from "zod";

// 2026-07-26 : 권한 - 계약 - 역할·기능토글 (피드백 6-1·6-2·6-3)
// "사용자별 ADMIN, USER, CUSTOMER 이정도로 나눠서 권한 분류시키고",
// "모든것을 쓸수있게 하는게 아니라 껏다켯다 하는식으로".
//
// 설계 두 가지를 여기서 못박는다.
//
// ① **끄는 목록을 저장한다(허용 목록이 아니라).**
//    허용 목록으로 하면 기능을 새로 만들 때마다 기존 사용자 전원이 그 기능을 못 쓴다 —
//    아무도 켜 주지 않으면 조용히 사라진 것과 같다. 끄는 목록이면 새 기능은 기본으로 켜지고,
//    관리자가 필요할 때만 끈다. 마이그레이션이 아직 적용되지 않아 컬럼이 없어도 같은 결과다.
//
// ② **역할은 화면을 가르고, 기능 토글은 그 안에서 다시 가른다.**
//    둘을 한 값으로 합치면 "관리자인데 뉴스만 끄고 싶다"를 표현할 수 없다.

export const ROLES = ["admin", "user", "customer"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

// 알 수 없는 값이 오면 가장 권한이 낮은 쪽으로 떨어뜨린다(모르면 더 주지 않는다).
export const DEFAULT_ROLE: Role = "user";

export function parseRole(value: unknown): Role {
  const r = roleSchema.safeParse(value);
  return r.success ? r.data : DEFAULT_ROLE;
}

// 켜고 끌 수 있는 기능 목록. key는 DB에 저장되므로 바꾸면 기존 설정이 끊긴다 — 이름을 바꾸지 말고
// 새 key를 추가한다. label/description은 관리자 화면에 그대로 나온다.
export const FEATURES = [
  { key: "pages", label: "페이지", description: "노트·문서 작성과 데이터베이스" },
  { key: "insights", label: "통계", description: "활동 집계와 습관 히트맵" },
  { key: "news", label: "뉴스", description: "RSS 구독과 요약" },
  { key: "office", label: "오피스", description: "픽셀 오피스 화면" },
  { key: "duck-chat", label: "오리 대화", description: "오리에게 말 걸기와 도구 실행" },
  { key: "todo", label: "할 일", description: "할 일 위젯" },
  { key: "habit", label: "습관", description: "습관 위젯과 스트릭" },
  { key: "pomodoro", label: "뽀모도로", description: "집중 타이머" },
  { key: "memo", label: "메모", description: "빠른 메모" },
  { key: "calendar", label: "캘린더", description: "일정 위젯" },
  { key: "news-top", label: "오늘의 뉴스", description: "대시보드 뉴스 TOP 3" },
  { key: "github", label: "커밋 잔디", description: "GitHub 기여도 위젯" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];

const FEATURE_KEYS = new Set<string>(FEATURES.map((f) => f.key));

export function isFeatureKey(value: string): value is FeatureKey {
  return FEATURE_KEYS.has(value);
}

// 저장된 값에서 우리가 아는 key만 추린다. 모르는 key(지워진 기능·오타)는 버린다 —
// 남겨 두면 화면에 이름 없는 항목이 뜨고, 무엇이 꺼진 건지 아무도 알 수 없다.
export function parseDisabledFeatures(value: unknown): FeatureKey[] {
  if (!Array.isArray(value)) return [];
  const out: FeatureKey[] = [];
  for (const v of value) {
    if (typeof v === "string" && isFeatureKey(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

// customer는 자기 데이터를 만들지 않고 공개된 것만 본다. 그래서 작성 계열 기능은 역할 수준에서
// 막는다 — 관리자가 하나씩 꺼 주지 않아도 되게. (아래 목록에 없는 기능은 토글로만 제어된다.)
const CUSTOMER_BLOCKED: readonly FeatureKey[] = [
  "todo",
  "habit",
  "pomodoro",
  "memo",
  "calendar",
  "github",
  "duck-chat",
  "insights",
  "office",
];

export type Access = {
  role: Role;
  disabledFeatures: readonly FeatureKey[];
};

// 이 사용자가 그 기능을 쓸 수 있는가. 화면·API 양쪽이 **같은 함수**를 쓴다 —
// 화면에서만 숨기면 주소를 직접 치는 사람에겐 열려 있는 것과 같다.
export function canUseFeature(access: Access, feature: FeatureKey): boolean {
  if (access.disabledFeatures.includes(feature)) return false;
  if (access.role === "customer" && CUSTOMER_BLOCKED.includes(feature)) return false;
  return true;
}

// 관리자 화면·관리 API에 들어갈 수 있는가. 기능 토글로는 끌 수 없다 —
// 관리자가 자기 권한을 꺼 버리면 되돌릴 방법이 사라진다.
export function canAdminister(access: Pick<Access, "role">): boolean {
  return access.role === "admin";
}

// 역할 표시 이름(화면 공용 — 세 군데서 각자 표를 들지 않게).
const ROLE_LABELS: Record<Role, string> = {
  admin: "관리자",
  user: "일반 사용자",
  customer: "열람 전용",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
