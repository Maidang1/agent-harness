mod commands;
mod config;
mod memory;
mod metadata;
mod openrouter;

use commands::{
    clear_user_memory, generate_user_memory_from_prompt, get_app_metadata, get_preference_memory,
    get_user_memory, save_user_memory,
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
            save_user_memory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod module_contract_tests {
    use crate::{
        config::{
            build_client_config, ClientConfig, ClientOpenRouterConfig, DEFAULT_OPENROUTER_BASE_URL,
            DEFAULT_OPENROUTER_MODEL,
        },
        memory::{
            preference_memory_from_user_memory, EvidenceMemory, ProfileMemory, ReadingPlanMemory,
            ReadingPlanStatus, UserMemory,
        },
    };

    #[test]
    fn config_and_memory_modules_expose_core_domain_boundaries() {
        let runtime_config = build_client_config(ClientConfig {
            openrouter: ClientOpenRouterConfig {
                api_key: " sk-test ".to_string(),
                model: None,
                base_url: Some(" ".to_string()),
            },
            memory: None,
        })
        .unwrap();

        assert_eq!(runtime_config.openrouter.api_key, "sk-test");
        assert_eq!(runtime_config.openrouter.model, DEFAULT_OPENROUTER_MODEL);
        assert_eq!(
            runtime_config.openrouter.base_url,
            DEFAULT_OPENROUTER_BASE_URL
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

        let preference_memory = preference_memory_from_user_memory(&memory);

        assert_eq!(preference_memory.summary, "最近想读文学小说");
        assert_eq!(preference_memory.queries, vec!["最近想读文学小说"]);
    }
}
