use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
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
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()?;
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
        // symlink_metadata는 링크 대상이 아니라 링크 자체를 본다 - 심볼릭 링크/정션이면
        // is_dir()가 false라 걸러진다. ~/.claude/projects 밖을 링크로 끌어와 집계에 섞는 것을 막음.
        let Ok(meta) = fs::symlink_metadata(&project_path) else {
            continue;
        };
        if !meta.is_dir() {
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

// 지금 이 순간의 로컬 UTC 오프셋. 조회 실패 시 UTC로 대체(자정 근처 작업이 엉뚱한 날짜로
// 잡히는 문제를 막기 위함 - 코드리뷰에서 지적된 버그 수정).
// ponytail: current_local_offset은 고정 오프셋이라 과거 mtime에 '현재' 오프셋을 적용한다 -
// DST 사용 타임존에서 자정 인근 파일이 연 2회 하루 어긋날 수 있으나(KST는 DST 없어 무영향),
// mtime 집계 자체가 근사치라는 전제와 궤를 같이하는 허용된 한계.
fn local_offset() -> UtcOffset {
    UtcOffset::current_local_offset().unwrap_or(UtcOffset::UTC)
}

// 순수 함수: mtime instant + 오프셋 -> "YYYY-MM-DD". 자정 경계/오프셋 적용 로직을 여기 모아
// 테스트로 고정한다(회귀 방지 - session_date를 UTC로 되돌리는 실수를 잡기 위함).
fn format_local_date(modified: SystemTime, offset: UtcOffset) -> String {
    let date = OffsetDateTime::from(modified).to_offset(offset).date();
    format!(
        "{:04}-{:02}-{:02}",
        date.year(),
        u8::from(date.month()),
        date.day()
    )
}

// 파일 내용은 읽지 않고 수정 시각(mtime)만으로 날짜를 판단한다(프라이버시 원칙,
// 세션이 여러 날에 걸치면 마지막 활동일로 집계되는 근사치).
fn session_date(path: &Path) -> Option<String> {
    let modified = fs::metadata(path).ok()?.modified().ok()?;
    Some(format_local_date(modified, local_offset()))
}

// 순수 집계: 파일 목록 -> 날짜별 카운트. 프로덕션 커맨드와 테스트가 같은 함수를 쓴다
// (테스트가 코드 사본이 아니라 실제 집계 로직을 검증하도록).
fn aggregate(files: &[PathBuf]) -> Vec<DailyCount> {
    let mut counts: BTreeMap<String, u32> = BTreeMap::new();
    for file in files {
        if let Some(date) = session_date(file) {
            *counts.entry(date).or_insert(0) += 1;
        }
    }
    counts
        .into_iter()
        .map(|(date, count)| DailyCount { date, count })
        .collect()
}

// async 커맨드로 워커 스레드에서 실행한다(동기 커맨드는 webview UI 스레드를 인라인 점유해
// 세션 파일이 많아지면 위젯 창이 얼어붙는다 - 리뷰 REF-MEDIUM 수정).
#[tauri::command(async)]
pub fn collect_claude_logs(app: AppHandle) -> Result<Vec<DailyCount>, String> {
    let projects_dir = claude_projects_dir().ok_or("홈 디렉터리를 찾을 수 없습니다")?;
    let files = find_session_files(&projects_dir);
    let total = files.len();
    let counts = aggregate(&files);
    // 스캔은 보통 1초 이내라 완료 이벤트 1회만 보낸다(파일당 emit로 IPC를 폭증시키지 않음).
    if let Err(err) = app.emit(
        "collector://progress",
        ScanProgress {
            scanned: total,
            total,
        },
    ) {
        log::warn!("collector://progress emit 실패: {err}");
    }
    Ok(counts)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("ldd-collector-test-{name}-{}", std::process::id()));
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

    // 자정 경계 회귀 고정: 오프셋을 실제로 적용해 날짜를 매기는지 검증한다.
    // session_date를 UTC로 되돌리는 실수(원래 버그)가 나면 이 테스트가 깨진다.
    #[test]
    fn format_local_date_applies_offset_across_midnight() {
        use time::{Date, Month};
        // UTC 2026-07-20 15:30 == KST(+09:00) 2026-07-21 00:30 (자정 직후)
        let instant: SystemTime = Date::from_calendar_date(2026, Month::July, 20)
            .unwrap()
            .with_hms(15, 30, 0)
            .unwrap()
            .assume_utc()
            .into();

        let kst = UtcOffset::from_hms(9, 0, 0).unwrap();
        assert_eq!(format_local_date(instant, kst), "2026-07-21");
        // 같은 순간을 UTC로 매기면 전날 - 오프셋이 실제로 날짜를 바꿈을 증명.
        assert_eq!(format_local_date(instant, UtcOffset::UTC), "2026-07-20");
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
    fn aggregate_buckets_files_by_distinct_days() {
        // 프로덕션 collect_claude_logs가 쓰는 그 aggregate 함수를 직접 검증한다
        // (테스트가 코드 사본이 아니라 실제 집계 로직을 돌린다).
        use std::time::Duration;
        let root = temp_dir("aggregate");
        let project = root.join("proj");
        fs::create_dir_all(&project).unwrap();
        for name in ["a.jsonl", "b.jsonl", "c.jsonl"] {
            fs::write(project.join(name), "").unwrap();
        }

        // a, b는 지금 / c는 3일 전으로 mtime을 심는다 - 오프셋과 무관하게 다른 날짜로 갈린다.
        let now = SystemTime::now();
        let three_days_ago = now - Duration::from_secs(3 * 24 * 60 * 60);
        set_mtime(&project.join("a.jsonl"), now);
        set_mtime(&project.join("b.jsonl"), now);
        set_mtime(&project.join("c.jsonl"), three_days_ago);

        let files = find_session_files(&root);
        assert_eq!(files.len(), 3);

        let result = aggregate(&files);
        // 서로 다른 두 날짜 버킷, 합계 3, 각 버킷 카운트는 2와 1.
        assert_eq!(
            result.len(),
            2,
            "3일 차이 나는 파일은 날짜별로 분리 집계돼야 한다"
        );
        assert_eq!(result.iter().map(|d| d.count).sum::<u32>(), 3);
        let mut counts: Vec<u32> = result.iter().map(|d| d.count).collect();
        counts.sort_unstable();
        assert_eq!(counts, vec![1, 2]);

        fs::remove_dir_all(&root).unwrap();
    }

    fn set_mtime(path: &Path, when: SystemTime) {
        let file = fs::File::options().write(true).open(path).unwrap();
        file.set_modified(when).unwrap();
    }
}
