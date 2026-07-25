// 2026-07-26 : RAG - 임베딩문구 - 단일출처이관
// 구현이 core로 옮겨갔다(packages/core/src/domain/embed-text.ts).
// 옮긴 이유: 여기(apps/web 위젯)와 packages/api(오리가 만든 항목)가 **각자 문구를 만들고 있어서**
// 한쪽만 고치면 다른 쪽은 그대로였다. 실제로 마감일·일정 시각이 빠진 채로 인덱싱되고 있었다.
//
// 이 파일은 구현을 갖지 않고 재노출만 한다 — 남아 있던 옛 구현을 그대로 두면 누군가
// 마감일 없는 버전을 다시 쓰게 된다. 파일 자체는 이제 필요 없지만 삭제는 사용자 확인
// 사항이라(CLAUDE.md 5절) 남겨 두었다. 지워도 무방하다.
export { todoEmbedText, calendarEventEmbedText } from "@ldd/core";
