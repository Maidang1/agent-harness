use crate::{
    chat::ChatMessage,
    config::{build_client_config, ClientConfig, RuntimeConfig},
    memory::{
        load_user_memory, merge_memory_extraction, preference_memory_from_user_memory,
        preference_memory_path, save_user_memory as persist_user_memory, user_memory_path,
        PreferenceMemory, UserMemory,
    },
    metadata::{app_metadata, AppMetadata},
    openrouter::{
        build_openrouter_messages, request_book_recommendation, request_memory_extraction,
    },
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
    memory: UserMemory,
) -> Result<UserMemory, String> {
    let user_path = user_memory_path(&app_handle)?;

    persist_user_memory(&user_path, &memory)
}

#[tauri::command]
pub(crate) async fn clear_user_memory(app_handle: tauri::AppHandle) -> Result<UserMemory, String> {
    let user_path = user_memory_path(&app_handle)?;

    persist_user_memory(&user_path, &UserMemory::default())
}

#[tauri::command]
pub(crate) async fn generate_user_memory_from_prompt(
    app_handle: tauri::AppHandle,
    prompt: String,
    config: ClientConfig,
) -> Result<UserMemory, String> {
    let RuntimeConfig {
        openrouter,
        wechat_api_key: _wechat_api_key,
        preferences: _preferences,
        memory: memory_settings,
    } = build_client_config(config)?;
    let user_path = user_memory_path(&app_handle)?;
    let legacy_path = preference_memory_path(&app_handle)?;
    let mut memory = load_user_memory(&user_path, &legacy_path)?;

    if !memory_settings.enabled || !memory_settings.auto_generate_from_prompt {
        return Ok(memory);
    }

    let prompt = prompt.trim();

    if prompt.is_empty() {
        return Ok(memory);
    }

    let extraction = request_memory_extraction(&openrouter, prompt, &memory).await?;
    merge_memory_extraction(&mut memory, extraction, prompt, current_timestamp_ms());

    persist_user_memory(&user_path, &memory)
}

#[tauri::command]
pub(crate) async fn get_app_metadata(app_handle: tauri::AppHandle) -> Result<AppMetadata, String> {
    Ok(app_metadata(&app_handle))
}

#[tauri::command]
pub(crate) async fn recommend_books(
    app_handle: tauri::AppHandle,
    messages: Vec<ChatMessage>,
    config: ClientConfig,
) -> Result<String, String> {
    let RuntimeConfig {
        openrouter,
        wechat_api_key: _wechat_api_key,
        preferences,
        memory: memory_settings,
    } = build_client_config(config)?;
    let user_path = user_memory_path(&app_handle)?;
    let legacy_path = preference_memory_path(&app_handle)?;
    let user_memory = load_user_memory(&user_path, &legacy_path)?;

    let openrouter_messages =
        build_openrouter_messages(messages, &user_memory, &preferences, &memory_settings);

    request_book_recommendation(&openrouter, &openrouter_messages).await
}

fn current_timestamp_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}
