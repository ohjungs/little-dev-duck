use tauri::{AppHandle, Manager};

// 활보 모드(Phase 6 T3): 바탕화면을 떠다니는 투명·클릭통과 오리 창(walker)을 켜고 끈다.
// 창 자체는 tauri.conf.json에서 숨김 상태로 미리 만들어지고, 여기서는 표시/숨김과
// 클릭 통과(set_ignore_cursor_events)만 제어한다. 클릭 통과를 JS가 아닌 Rust에서 켜는 이유:
// 옵션 A(원격 URL 로드)에서는 원격 오리진이 "Local"로 취급돼 창 API 권한 스코핑이 사실상
// 무효라(phase_05.md T2 참조), 신뢰 경계 안쪽인 Rust에서 거는 편이 확실하고 안전하다.
#[tauri::command]
pub fn set_walking_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("walker")
        .ok_or_else(|| "walker 창을 찾을 수 없습니다".to_string())?;

    // OS 원본 에러는 log로만 남기고 프런트에는 일반 메시지만 반환한다(내부 에러 노출 방지).
    if enabled {
        window.set_ignore_cursor_events(true).map_err(|e| {
            log::warn!("walker set_ignore_cursor_events 실패: {e}");
            "활보 창을 준비하지 못했습니다".to_string()
        })?;
        window.show().map_err(|e| {
            log::warn!("walker show 실패: {e}");
            "활보 창을 표시하지 못했습니다".to_string()
        })?;
    } else {
        window.hide().map_err(|e| {
            log::warn!("walker hide 실패: {e}");
            "활보 창을 숨기지 못했습니다".to_string()
        })?;
    }
    Ok(())
}
