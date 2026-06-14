mod chat;
mod commands;
mod config;
mod memory;
mod metadata;
mod openrouter;

use commands::{
    clear_user_memory, generate_user_memory_from_prompt, get_app_metadata, get_preference_memory,
    get_user_memory, recommend_books, save_user_memory,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            clear_user_memory,
            generate_user_memory_from_prompt,
            get_app_metadata,
            get_preference_memory,
            get_user_memory,
            recommend_books,
            save_user_memory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod module_contract_tests {
    use crate::{
        chat::ChatMessage,
        config::{
            build_client_config, ClientConfig, ClientOpenRouterConfig, MemorySettings,
            UserPreferences, DEFAULT_OPENROUTER_BASE_URL, DEFAULT_OPENROUTER_MODEL,
        },
        memory::{EvidenceMemory, ProfileMemory, ReadingPlanMemory, ReadingPlanStatus, UserMemory},
        openrouter::build_openrouter_messages,
    };

    #[test]
    fn config_memory_and_openrouter_modules_expose_core_domain_boundaries() {
        let runtime_config = build_client_config(ClientConfig {
            openrouter: ClientOpenRouterConfig {
                api_key: " sk-test ".to_string(),
                model: None,
                base_url: Some(" ".to_string()),
            },
            wechat_api_key: Some(" wx-test ".to_string()),
            preferences: Some(UserPreferences {
                favorite_categories: vec![" 文学小说 ".to_string(), "文学小说".to_string()],
            }),
            memory: None,
        })
        .unwrap();

        assert_eq!(runtime_config.openrouter.api_key, "sk-test");
        assert_eq!(runtime_config.openrouter.model, DEFAULT_OPENROUTER_MODEL);
        assert_eq!(
            runtime_config.openrouter.base_url,
            DEFAULT_OPENROUTER_BASE_URL
        );
        assert_eq!(runtime_config.wechat_api_key.as_deref(), Some("wx-test"));
        assert_eq!(
            runtime_config.preferences.favorite_categories,
            vec!["文学小说"]
        );

        let memory = UserMemory {
            profile: ProfileMemory {
                summary: "最近想读文学小说".to_string(),
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

        let messages = build_openrouter_messages(
            vec![ChatMessage {
                role: "user".to_string(),
                content: "推荐一本适合周末读的书".to_string(),
            }],
            &memory,
            &runtime_config.preferences,
            &MemorySettings::default(),
        );

        assert!(messages[1].content.contains("长期用户记忆"));
        assert!(messages[1].content.contains("最近想读文学小说"));
        assert!(messages[1].content.contains("显式偏好分类：文学小说"));
    }
}
