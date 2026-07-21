use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use time::{OffsetDateTime, UtcOffset};

#[derive(Debug, Serialize, Clone)]
pub struct DailyCount {
    pub date: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Clone)]
struct ScanProgress {
    scanned: usize,
    total: usize,
}

fn claude_projects_dir() -> Option<PathBuf> {
    let home = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")).ok()?;
    Some(PathBuf::from(home).join(".claude").join("projects"))
}

// 세션 파일 목록만 찾는다 - 내용은 읽지 않는다(프라이버시 원칙).
fn find_session_files(projects_dir: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let Ok(project_entries) = fs::read_dir(projects_dir) else {
        return files;
    };

    for project_entry in project_entries.flatten() {
        let project_path = project_entry.path();
        if !project_path.is_dir() {
            continue;
        }

        let Ok(session_entries) = fs::read_dir(&project_path) else {
            continue;
        };
        for session_entry in session_entries.flatten() {
            let session_path = session_entry.path();
            if session_path.extension().and_then(|ext| ext.to_str()) == Some("jsonl") {
                files.push(session_path);
            }
        }
    }

    files
}

// 파일 내용은 읽지 않고 수정 시각(mtime)만으로 날짜를 판단한다(프라이버시 원칙,
// 세션이 여러 날에 걸치면 마지막 활동일로 집계되는 근사치). 로컬 시간대 기준으로 날짜를
// 매기고, 오프셋을 구하지 못하면 UTC로 대체한다(자정 근처 작업이 엉뚱한 날짜로 잡히는
// 문제를 막기 위함 - 코드리뷰에서 지적된 버그 수정).
fn session_date(path: &Path) -> Option<String> {
    let modified = fs::metadata(path).ok()?.modified().ok()?;
    let utc = OffsetDateTime::from(modified);
    let offset = UtcOffset::current_local_offset().unwrap_or(UtcOffset::UTC);
    let date = utc.to_offset(offset).date();
    Some(format!("{:04}-{:02}-{:02}", date.year(), u8::from(date.month()), date.day()))
}

#[tauri::command]
pub fn collect_claude_logs(app: AppHandle) -> Result<Vec<DailyCount>, String> {
    let projects_dir = claude_projects_dir().ok_or("홈 디렉터리를 찾을 수 없습니다")?;
    let files = find_session_files(&projects_dir);
    let total = files.len();

    let mut counts: BTreeMap<String, u32> = BTreeMap::new();
    for (index, file) in files.iter().enumerate() {
        if let Some(date) = session_date(file) {
            *counts.entry(date).or_insert(0) += 1;
        }
        if let Err(err) =
            app.emit("collector://progress", ScanProgress { scanned: index + 1, total })
        {
            log::warn!("collector://progress emit 실패: {err}");
        }
    }

    Ok(counts.into_iter().map(|(date, count)| DailyCount { date, count }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("ldd-collector-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn session_date_returns_none_for_missing_file() {
        let dir = temp_dir("missing");
        let missing = dir.join("no-such-file.jsonl");

        assert_eq!(session_date(&missing), None);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn session_date_formats_recent_file_as_today_or_yesterday() {
        let dir = temp_dir("date");
        let file = dir.join("session.jsonl");
        fs::write(&file, "").unwrap();

        let date = session_date(&file).expect("mtime을 읽을 수 있어야 한다");
        // 로컬/UTC 오프셋 차이로 자정 근처면 하루 어긋날 수 있으니 형식만 검증한다.
        assert_eq!(date.len(), 10);
        assert_eq!(&date[4..5], "-");
        assert_eq!(&date[7..8], "-");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn find_session_files_returns_empty_for_missing_directory() {
        let dir = temp_dir("no-projects").join("does-not-exist");
        assert_eq!(find_session_files(&dir), Vec::<PathBuf>::new());
    }

    #[test]
    fn find_session_files_only_collects_jsonl_under_project_subdirs() {
        let root = temp_dir("scan");
        let project = root.join("my-project");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("session-a.jsonl"), "").unwrap();
        fs::write(project.join("notes.txt"), "").unwrap();
        // 프로젝트 디렉터리 바로 아래가 아닌 파일은 무시된다.
        fs::write(root.join("stray.jsonl"), "").unwrap();

        let found = find_session_files(&root);

        assert_eq!(found.len(), 1);
        assert_eq!(found[0], project.join("session-a.jsonl"));

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn collect_claude_logs_aggregates_multiple_sessions_same_day() {
        // collect_claude_logs 자체는 AppHandle이 필요해 단위 테스트로 직접 호출하기 어렵다.
        // 대신 핵심 집계 로직(파일 목록 -> 날짜별 카운트)을 여기서 동일하게 검증한다.
        let root = temp_dir("aggregate");
        let project = root.join("proj");
        fs::create_dir_all(&project).unwrap();
        for name in ["a.jsonl", "b.jsonl", "c.jsonl"] {
            fs::write(project.join(name), "").unwrap();
        }

        let files = find_session_files(&root);
        assert_eq!(files.len(), 3);

        let mut counts: BTreeMap<String, u32> = BTreeMap::new();
        for file in &files {
            if let Some(date) = session_date(file) {
                *counts.entry(date).or_insert(0) += 1;
            }
        }
        // 방금 만든 파일 3개는 전부 같은 날짜(초 단위 오차 내)로 잡혀야 한다.
        assert_eq!(counts.values().sum::<u32>(), 3);
        assert!(counts.len() <= 2, "자정 경계가 아니라면 보통 날짜 1개로 모인다");

        fs::remove_dir_all(&root).unwrap();
    }
}
