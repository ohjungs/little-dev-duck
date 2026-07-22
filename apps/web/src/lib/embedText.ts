// 할일 RAG 임베딩 텍스트. 제목만으론 오리가 완료 여부를 알 수 없어(임베딩=제목뿐),
// 완료 상태를 본문에 포함해 "완료한 할일"을 검색·답변할 수 있게 한다.
export function todoEmbedText(title: string, isDone: boolean): string {
  return `${title} (${isDone ? "완료" : "미완료"})`;
}
