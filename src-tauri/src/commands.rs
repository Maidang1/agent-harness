use crate::{
    chat::ChatMessage,
    config::{build_client_config, ClientConfig, RuntimeConfig},
    memory::{
        load_preference_memory, preference_memory_path, save_preference_memory,
        update_preference_memory, PreferenceMemory,
    },
    metadata::{app_metadata, AppMetadata},
    openrouter::{build_openrouter_messages, request_book_recommendation},
};

#[tauri::command]
pub(crate) async fn get_preference_memory(
    app_handle: tauri::AppHandle,
) -> Result<PreferenceMemory, String> {
    let memory_path = preference_memory_path(&app_handle)?;

    load_preference_memory(&memory_path)
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
    } = build_client_config(config)?;
    let memory_path = preference_memory_path(&app_handle)?;
    let mut preference_memory = load_preference_memory(&memory_path)?;

    let openrouter_messages =
        build_openrouter_messages(messages.clone(), &preference_memory, &preferences);
    update_preference_memory(&mut preference_memory, &messages);
    save_preference_memory(&memory_path, &preference_memory)?;

    request_book_recommendation(&openrouter, &openrouter_messages).await
}
