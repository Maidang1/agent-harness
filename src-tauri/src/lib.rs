mod codex;
mod commands;
mod config;
mod memory;
mod metadata;
mod openrouter;
mod weread;

use codex::CodexRunState;
use commands::{
    cancel_codex_run, clear_user_memory, generate_user_memory_from_prompt, get_app_metadata,
    get_codex_auth_status, get_preference_memory, get_reading_workspace, get_user_memory,
    get_weread_book_notes, get_weread_snapshot, save_reading_workspace, save_user_memory,
    start_codex_chat_run, sync_weread_snapshot,
};
use memory::MemoryState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CodexRunState::default())
        .manage(MemoryState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            cancel_codex_run,
            clear_user_memory,
            generate_user_memory_from_prompt,
            get_app_metadata,
            get_codex_auth_status,
            get_preference_memory,
            get_reading_workspace,
            get_user_memory,
            get_weread_book_notes,
            get_weread_snapshot,
            save_reading_workspace,
            save_user_memory,
            start_codex_chat_run,
            sync_weread_snapshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod module_contract_tests {
    use crate::{
        config::{
            build_client_config, ClientCodexConfig, ClientConfig, ClientOpenRouterConfig,
            ClientProvider, DEFAULT_OPENROUTER_BASE_URL, DEFAULT_OPENROUTER_MODEL,
        },
        memory::{
            effective_profile_summary, preference_memory_from_user_memory, EvidenceMemory,
            ProfileMemory, ReadingPlanMemory, ReadingPlanStatus, UserMemory,
        },
    };

    #[test]
    fn config_and_memory_modules_expose_core_domain_boundaries() {
        let runtime_config = build_client_config(ClientConfig {
            provider: ClientProvider::Openrouter,
            openrouter: ClientOpenRouterConfig {
                api_key: " sk-test ".to_string(),
                model: None,
                base_url: Some(" ".to_string()),
            },
            codex: ClientCodexConfig::default(),
            memory: None,
        })
        .unwrap();

        let openrouter = runtime_config.openrouter.unwrap();

        assert_eq!(openrouter.api_key, "sk-test");
        assert_eq!(openrouter.model, DEFAULT_OPENROUTER_MODEL);
        assert_eq!(openrouter.base_url, DEFAULT_OPENROUTER_BASE_URL);

        let memory = UserMemory {
            profile: ProfileMemory {
                summary: String::new(),
                user_summary: "手动偏好短篇小说".to_string(),
                auto_summary: "最近想读文学小说".to_string(),
                learned_categories: vec!["文学小说".to_string()],
                notes: vec![],
            },
            plans: vec![ReadingPlanMemory {
                id: "plan-a".to_string(),
                title: "周末阅读计划".to_string(),
                goal: "找一本适合周末读的小说".to_string(),
                status: ReadingPlanStatus::Active,
                evidence: "用户提到周末读书".to_string(),
                updated_at: 1,
            }],
            evidence: EvidenceMemory {
                recent_prompts: vec!["最近想读文学小说".to_string()],
            },
            ..UserMemory::default()
        };

        let preference_memory = preference_memory_from_user_memory(&memory);

        assert_eq!(
            effective_profile_summary(&memory.profile),
            "手动偏好短篇小说；最近想读文学小说"
        );
        assert_eq!(
            preference_memory.summary,
            "手动偏好短篇小说；最近想读文学小说"
        );
        assert_eq!(preference_memory.queries, vec!["最近想读文学小说"]);
    }
}

#[cfg(test)]
mod weread_contract_tests {
    use serde_json::json;

    use crate::weread::{
        build_gateway_payload, load_weread_snapshot, mark_snapshot_sync_failed,
        normalize_book_progress, normalize_notebook_count, save_weread_snapshot,
        WEREAD_SKILL_VERSION,
    };

    #[test]
    fn gateway_payload_flattens_business_params() {
        let payload = build_gateway_payload(
            "/user/notebooks",
            json!({
                "count": 100,
                "lastSort": 1516907353,
            }),
        );

        assert_eq!(payload["api_name"], "/user/notebooks");
        assert_eq!(payload["skill_version"], WEREAD_SKILL_VERSION);
        assert_eq!(payload["count"], 100);
        assert_eq!(payload["lastSort"], 1516907353);
        assert!(payload.get("params").is_none());
    }

    #[test]
    fn notebook_count_uses_reviews_highlights_and_bookmarks() {
        assert_eq!(normalize_notebook_count(2, 3, 4), 9);
    }

    #[test]
    fn progress_keeps_zero_to_one_hundred_percent_scale() {
        assert_eq!(normalize_book_progress(1), 1);
        assert_eq!(normalize_book_progress(100), 100);
        assert_eq!(normalize_book_progress(230), 100);
    }

    #[test]
    fn snapshot_cache_recovers_bad_json_and_marks_failed_sync() {
        let path =
            std::env::temp_dir().join(format!("book-agent-weread-{}.json", std::process::id()));
        std::fs::write(&path, "{bad json").unwrap();

        let loaded = load_weread_snapshot(&path).unwrap();

        assert_eq!(loaded.status, "empty");
        assert_eq!(loaded.shelf.total_count, 0);

        let snapshot = mark_snapshot_sync_failed(loaded, "网络失败", 1700000000000);
        let saved = save_weread_snapshot(&path, &snapshot).unwrap();
        let reloaded = load_weread_snapshot(&path).unwrap();

        assert_eq!(saved.status, "failed");
        assert_eq!(reloaded.error_message, "网络失败");

        let _ = std::fs::remove_file(path);
    }
}
