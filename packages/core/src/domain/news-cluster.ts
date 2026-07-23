// Phase 15 T3 — 뉴스 클러스터링(관련 기사 묶기). 무의존성 순수함수:
// 제목+스니펫을 토큰화 → 토큰 집합의 Jaccard 유사도 → union-find 단일연결 군집화.
// ponytail: 형태소 분석·임베딩 없이 토큰 교집합만으로 "같은 사건 헤드라인 묶기" 수준을 노린다.
// 한글은 공백 기준이라 조사·복합어를 못 나눠 정밀도는 제한적 — 실사용에서 부족하면 임베딩(pgvector,
// 이미 있음)으로 승격. core는 플랫폼 중립이라 여기선 전역 API(URL/fetch 등)를 쓰지 않는다.

// 홀로 서는 흔한 기능어만 최소로. 한글 조사는 단어에 붙어 공백 토큰이 아니라 제외 목록이 짧다.
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "for",
  "on",
  "and",
  "or",
  "및",
  "등",
  "그",
  "이",
  "저",
]);

// 최소 토큰 길이(한 글자 토큰은 변별력이 낮아 제거).
const MIN_TOKEN_LEN = 2;

// 텍스트를 군집화용 토큰 배열로. 소문자화, 문자/숫자 외(구두점)를 공백으로, 불용어·짧은 토큰 제거.
// \p{L}\p{N}로 한글·영문·숫자를 모두 보존(u 플래그).
export function tokenizeForCluster(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
}

// 두 토큰 집합의 Jaccard 유사도 = 교집합/합집합. 둘 다 비면 0(유사도 없음으로 취급).
function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface ClusterableArticle {
  id: string;
  title: string;
  snippet?: string | null;
}

export interface ArticleCluster<T> {
  key: string; // 대표 기사 id(군집 내 최초 등장 = 안정 라벨)
  articles: T[]; // 구성원, 입력 순서 유지
}

// 기사 목록을 유사도 군집으로 묶는다. threshold(기본 0.4) 이상이면 같은 군집(단일연결 = 추이적 병합).
// O(n²) 쌍 비교 — 개인 뉴스 리더 규모(수십~수백 건)엔 충분. 대량이면 임베딩 기반으로 승격.
// 반환: 군집 배열(최초 등장 순), 각 군집은 구성원을 입력 순서로 담고 key는 대표(최초) 기사 id.
export function clusterArticles<T extends ClusterableArticle>(
  articles: readonly T[],
  options: { threshold?: number } = {},
): ArticleCluster<T>[] {
  const threshold = options.threshold ?? 0.4;
  const n = articles.length;
  if (n === 0) return [];

  const tokenSets = articles.map(
    (a) => new Set(tokenizeForCluster(`${a.title} ${a.snippet ?? ""}`)),
  );

  // union-find(경로 압축). 루트는 항상 더 작은 인덱스로 모아 대표=최초 등장 기사가 되게 한다.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (jaccard(tokenSets[i], tokenSets[j]) >= threshold) union(i, j);
    }
  }

  // 루트별 그룹화. 최초 등장 순서로 군집 순서를 정하고 구성원도 입력 순서 유지.
  const groups = new Map<number, T[]>();
  const order: number[] = [];
  articles.forEach((article, i) => {
    const root = find(i);
    let members = groups.get(root);
    if (!members) {
      members = [];
      groups.set(root, members);
      order.push(root);
    }
    members.push(article);
  });

  return order.map((root) => ({
    key: articles[root].id,
    articles: groups.get(root) ?? [],
  }));
}
