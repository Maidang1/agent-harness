use crate::{
    codex::{
        cancel_codex_run as cancel_codex_run_command,
        get_codex_auth_status as get_codex_auth_status_command,
        request_memory_extraction as request_codex_memory_extraction,
        start_codex_chat_run as start_codex_chat_run_command, CodexAuthStatus, CodexRunState,
    },
    config::ClientProvider,
    config::{build_client_config, ClientConfig, RuntimeConfig},
    memory::{
        load_user_memory, mark_learning_status, merge_memory_extraction,
        preference_memory_from_user_memory, preference_memory_path,
        save_user_memory as persist_user_memory, user_memory_path, LearningStatus, MemoryState,
        PreferenceMemory, UserMemory,
    },
    metadata::{app_metadata, AppMetadata},
    openrouter::request_memory_extraction as request_openrouter_memory_extraction,
};

#[tauri::command]
pub(crate) async fn get_preference_memory(
    app_handle: tauri::AppHandle,
) -> Result<PreferenceMemory, String> {
    let user_path = user_memory_path(&app_handle)?;
    let legacy_path = preference_memory_path(&app_handle)?;
    let memory = load_user_memory(&user_path, &legacy_path)?;

    Ok(preference_memory_from_user_memory(&memory))
}

#[tauri::command]
pub(crate) async fn get_user_memory(app_handle: tauri::AppHandle) -> Result<UserMemory, String> {
    let user_path = user_memory_path(&app_handle)?;
    let legacy_path = preference_memory_path(&app_handle)?;

    load_user_memory(&user_path, &legacy_path)
}

#[tauri::command]
pub(crate) async fn save_user_memory(
    app_handle: tauri::AppHandle,
    memory_state: tauri::State<'_, MemoryState>,
    memory: UserMemory,
) -> Result<UserMemory, String> {
    let _guard = memory_state.lock().await;
    let user_path = user_memory_path(&app_handle)?;

    persist_user_memory(&user_path, &memory)
}

#[tauri::command]
pub(crate) async fn clear_user_memory(
    app_handle: tauri::AppHandle,
    memory_state: tauri::State<'_, MemoryState>,
) -> Result<UserMemory, String> {
    let _guard = memory_state.lock().await;
    let user_path = user_memory_path(&app_handle)?;

    persist_user_memory(&user_path, &UserMemory::default())
}

#[tauri::command]
pub(crate) async fn generate_user_memory_from_prompt(
    app_handle: tauri::AppHandle,
    memory_state: tauri::State<'_, MemoryState>,
    prompt: String,
    config: ClientConfig,
) -> Result<UserMemory, String> {
    let _guard = memory_state.lock().await;
    let now = current_timestamp_ms();
    let user_path = user_memory_path(&app_handle)?;
    let legacy_path = preference_memory_path(&app_handle)?;
    let mut memory = load_user_memory(&user_path, &legacy_path)?;
    let memory_settings = config.memory.unwrap_or_default();

    if !memory_settings.enabled || !memory_settings.auto_generate_from_prompt {
        mark_learning_status(
            &mut memory,
            LearningStatus::Skipped,
            "自动学习未开启。",
            now,
        );

        return persist_user_memory(&user_path, &memory);
    }

    let prompt = prompt.trim();

    if prompt.is_empty() {
        mark_learning_status(
            &mut memory,
            LearningStatus::Skipped,
            "这次提问为空，已跳过自动学习。",
            now,
        );

        return persist_user_memory(&user_path, &memory);
    }

    let runtime_config = match build_client_config(config) {
        Ok(config) => config,
        Err(error) => {
            mark_learning_status(
                &mut memory,
                LearningStatus::Skipped,
                format!("配置不可用：{error}"),
                now,
            );

            return persist_user_memory(&user_path, &memory);
        }
    };
    let RuntimeConfig {
        provider,
        openrouter,
        codex,
        memory: runtime_memory_settings,
    } = runtime_config;
    let _ = runtime_memory_settings;

    let extraction_result = match provider {
        ClientProvider::Openrouter => {
            let openrouter = openrouter
                .as_ref()
                .ok_or_else(|| "请在客户端配置 OpenRouter API Key。".to_string())?;
            request_openrouter_memory_extraction(openrouter, prompt, &memory).await
        }
        ClientProvider::Codex => request_codex_memory_extraction(&codex, prompt, &memory).await,
    };
    let extraction = match extraction_result {
        Ok(extraction) => extraction,
        Err(error) => {
            mark_learning_status(
                &mut memory,
                LearningStatus::Failed,
                format!("自动学习失败：{error}"),
                now,
            );

            return persist_user_memory(&user_path, &memory);
        }
    };
    merge_memory_extraction(&mut memory, extraction, prompt, now);
    mark_learning_status(
        &mut memory,
        LearningStatus::Success,
        "已根据这次提问更新记忆。",
        now,
    );

    persist_user_memory(&user_path, &memory)
}

#[tauri::command]
pub(crate) async fn get_codex_auth_status() -> Result<CodexAuthStatus, String> {
    get_codex_auth_status_command().await
}

#[tauri::command]
pub(crate) async fn start_codex_chat_run(
    app_handle: tauri::AppHandle,
    run_id: String,
    prompt: String,
    config: ClientConfig,
) -> Result<(), String> {
    let runtime_config = build_client_config(config)?;

    start_codex_chat_run_command(app_handle, run_id, prompt, runtime_config.codex).await
}

#[tauri::command]
pub(crate) async fn cancel_codex_run(
    state: tauri::State<'_, CodexRunState>,
    run_id: String,
) -> Result<(), String> {
    cancel_codex_run_command(state, run_id).await
}

#[tauri::command]
pub(crate) async fn get_app_metadata(app_handle: tauri::AppHandle) -> Result<AppMetadata, String> {
    Ok(app_metadata(&app_handle))
}

fn current_timestamp_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}
