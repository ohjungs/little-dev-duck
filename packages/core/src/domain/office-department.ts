// Phase D — 부서 정의 + 오리 이름 목록(순수 데이터, 사이드이펙트 없음).

export const DEPARTMENTS = [
  "engineering", "marketing", "design", "hr", "finance",
  "sales", "support", "qa", "operations",
] as const;
export type DepartmentId = typeof DEPARTMENTS[number];

export type DuckAccessory =
  | "glasses"
  | "hoodie"
  | "beret"
  | "tie"
  | "headset"
  | "badge"
  | "magnifier"
  | "clipboard";

export type Department = {
  id: DepartmentId;
  label: string;
  color: string;
  accessory: DuckAccessory;
  headcount: number;
  roles: string[]; // 한글 직책명
};

export const DEPT_REGISTRY: Record<DepartmentId, Department> = {
  engineering: {
    id: "engineering",
    label: "개발팀",
    color: "#4A90D9",
    accessory: "glasses",
    headcount: 6,
    roles: [
      "시니어 개발자",
      "주니어 개발자",
      "풀스택 개발자",
      "백엔드 개발자",
      "프론트엔드 개발자",
      "DevOps 엔지니어",
    ],
  },
  marketing: {
    id: "marketing",
    label: "마케팅팀",
    color: "#E84C3D",
    accessory: "tie",
    headcount: 4,
    roles: ["마케팅 매니저", "콘텐츠 마케터", "SNS 마케터", "퍼포먼스 마케터"],
  },
  design: {
    id: "design",
    label: "디자인팀",
    color: "#9B59B6",
    accessory: "beret",
    headcount: 4,
    roles: ["UI 디자이너", "UX 디자이너", "그래픽 디자이너", "모션 디자이너"],
  },
  hr: {
    id: "hr",
    label: "인사팀",
    color: "#2ECC71",
    accessory: "badge",
    headcount: 3,
    roles: ["인사 매니저", "채용 담당자", "교육 담당자"],
  },
  finance: {
    id: "finance",
    label: "재무팀",
    color: "#2C3E50",
    accessory: "glasses",
    headcount: 3,
    roles: ["재무 매니저", "회계사", "경리"],
  },
  sales: {
    id: "sales",
    label: "영업팀",
    color: "#E67E22",
    accessory: "headset",
    headcount: 4,
    roles: ["영업 매니저", "영업 사원", "고객 관리", "파트너십 담당"],
  },
  support: {
    id: "support",
    label: "고객지원팀",
    color: "#1ABC9C",
    accessory: "headset",
    headcount: 4,
    roles: ["CS 매니저", "CS 상담원", "기술 지원", "VoC 분석가"],
  },
  qa: {
    id: "qa",
    label: "QA팀",
    color: "#F1C40F",
    accessory: "magnifier",
    headcount: 4,
    roles: ["QA 매니저", "QA 엔지니어", "자동화 테스터", "수동 테스터"],
  },
  operations: {
    id: "operations",
    label: "운영팀",
    color: "#95A5A6",
    accessory: "clipboard",
    headcount: 3,
    roles: ["운영 매니저", "시스템 관리자", "보안 담당자"],
  },
};

// 오리 테마 한글 이름 목록. 전체 headcount 합계(35) 이상을 확보한다.
export const DUCK_NAMES = [
  "꽥돌이", "노랑이", "뽀롱이", "달콩이", "하늘이",
  "구름이", "별이", "달이", "봄이", "여름이",
  "가을이", "겨울이", "초코", "바닐라", "카라멜",
  "모카", "라떼", "마카롱", "푸딩", "젤리",
  "쿠키", "도넛", "머핀", "타르트", "크림",
  "버블", "솜사탕", "딸기", "블루베리", "체리",
  "망고", "키위", "멜론", "복숭아", "포도",
];

export function getDepartment(id: DepartmentId): Department {
  return DEPT_REGISTRY[id];
}
