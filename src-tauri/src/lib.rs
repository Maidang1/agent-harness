use serde::{Deserialize, Serialize};
use serde_json::Value;

const SYSTEM_PROMPT: &str = r#"你是一个专业的读书推荐助手，名为「读书推荐 Agent」。

你的能力：
- 基于用户的阅读需求、兴趣、目标推荐合适的书籍
- 提供具体的推荐理由和阅读建议
- 如果用户追问或补充需求，基于对话历史给出更精准的推荐

回复规范：
- 使用自然、友好的对话语气
- 推荐书籍时，每本书给出：书名、作者、推荐理由、适合人群、阅读建议
- 回复保持简洁有力

推荐标准：
- 和用户需求高度相关
- 推荐理由具体
- 适合用户当前的阅读目标"#;

const DEFAULT_OPENROUTER_MODEL: &str = "deepseek/deepseek-v4-flash";
const DEFAULT_OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1/chat/completions";

#[derive(Debug, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientConfig {
    openrouter: ClientOpenRouterConfig,
    wechat_api_key: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientOpenRouterConfig {
    api_key: String,
    model: Option<String>,
    base_url: Option<String>,
}

#[derive(Debug)]
struct RuntimeConfig {
    openrouter: OpenRouterConfig,
    wechat_api_key: Option<String>,
}

#[derive(Debug)]
struct OpenRouterConfig {
    api_key: String,
    model: String,
    base_url: String,
}

#[derive(Debug, Serialize)]
struct OpenRouterMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    choices: Vec<OpenRouterChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterAssistantMessage,
}

#[derive(Debug, Deserialize)]
struct OpenRouterAssistantMessage {
    content: Option<Value>,
}

#[tauri::command]
async fn recommend_books(
    messages: Vec<ChatMessage>,
    config: ClientConfig,
) -> Result<String, String> {
    let RuntimeConfig {
        openrouter: openrouter_config,
        wechat_api_key: _wechat_api_key,
    } = build_client_config(config)?;

    let mut openrouter_messages = vec![OpenRouterMessage {
        role: "system".to_string(),
        content: SYSTEM_PROMPT.to_string(),
    }];

    openrouter_messages.extend(messages.into_iter().filter_map(|message| {
        let role = match message.role.as_str() {
            "user" => "user",
            "assistant" => "assistant",
            _ => return None,
        };
        let content = message.content.trim();

        if content.is_empty() {
            None
        } else {
            Some(OpenRouterMessage {
                role: role.to_string(),
                content: content.to_string(),
            })
        }
    }));

    let client = reqwest::Client::new();
    let response = client
        .post(&openrouter_config.base_url)
        .bearer_auth(&openrouter_config.api_key)
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "tauri://book-agent")
        .header("X-Title", "Book Agent")
        .json(&serde_json::json!({
            "model": openrouter_config.model,
            "messages": openrouter_messages,
            "stream": false,
        }))
        .send()
        .await
        .map_err(|error| format!("请求 OpenRouter 失败：{error}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("读取 OpenRouter 响应失败：{error}"))?;

    if !status.is_success() {
        return Err(format!(
            "OpenRouter 返回 {status}：{}",
            truncate_error_body(&body)
        ));
    }

    let parsed: OpenRouterResponse = serde_json::from_str(&body)
        .map_err(|error| format!("解析 OpenRouter 响应失败：{error}"))?;

    parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_ref())
        .and_then(value_to_text)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| "OpenRouter 响应中没有可展示内容。".to_string())
}

fn build_client_config(config: ClientConfig) -> Result<RuntimeConfig, String> {
    Ok(RuntimeConfig {
        openrouter: build_openrouter_config(config.openrouter)?,
        wechat_api_key: optional_secret_value(config.wechat_api_key),
    })
}

fn build_openrouter_config(config: ClientOpenRouterConfig) -> Result<OpenRouterConfig, String> {
    let api_key = config.api_key.trim().to_string();

    if api_key.is_empty() {
        return Err("请在客户端配置 OpenRouter API Key。".to_string());
    }

    Ok(OpenRouterConfig {
        api_key,
        model: optional_config_value(config.model, DEFAULT_OPENROUTER_MODEL),
        base_url: optional_config_value(config.base_url, DEFAULT_OPENROUTER_BASE_URL),
    })
}

fn optional_config_value(value: Option<String>, default_value: &str) -> String {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(default_value)
        .to_string()
}

fn optional_secret_value(value: Option<String>) -> Option<String> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn value_to_text(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => Some(text.clone()),
        Value::Array(parts) => Some(
            parts
                .iter()
                .filter_map(|part| part.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join(""),
        ),
        _ => None,
    }
}

fn truncate_error_body(body: &str) -> String {
    const MAX_LEN: usize = 600;

    if body.chars().count() <= MAX_LEN {
        body.to_string()
    } else {
        format!("{}...", body.chars().take(MAX_LEN).collect::<String>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn openrouter_config_requires_client_api_key() {
        let error = build_openrouter_config(ClientOpenRouterConfig {
            api_key: "   ".to_string(),
            model: None,
            base_url: None,
        })
        .unwrap_err();

        assert_eq!(error, "请在客户端配置 OpenRouter API Key。");
    }

    #[test]
    fn openrouter_config_trims_client_values() {
        let config = build_openrouter_config(ClientOpenRouterConfig {
            api_key: "  sk-test  ".to_string(),
            model: Some("  deepseek/test  ".to_string()),
            base_url: Some("  https://example.com/api/chat  ".to_string()),
        })
        .unwrap();

        assert_eq!(config.api_key, "sk-test");
        assert_eq!(config.model, "deepseek/test");
        assert_eq!(config.base_url, "https://example.com/api/chat");
    }

    #[test]
    fn openrouter_config_fills_optional_defaults() {
        let config = build_openrouter_config(ClientOpenRouterConfig {
            api_key: "sk-test".to_string(),
            model: Some(" ".to_string()),
            base_url: None,
        })
        .unwrap();

        assert_eq!(config.model, DEFAULT_OPENROUTER_MODEL);
        assert_eq!(config.base_url, DEFAULT_OPENROUTER_BASE_URL);
    }

    #[test]
    fn client_config_trims_wechat_api_key() {
        let config = build_client_config(ClientConfig {
            openrouter: ClientOpenRouterConfig {
                api_key: "sk-test".to_string(),
                model: None,
                base_url: None,
            },
            wechat_api_key: Some("  wx-test  ".to_string()),
        })
        .unwrap();

        assert_eq!(config.wechat_api_key.as_deref(), Some("wx-test"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![recommend_books])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
