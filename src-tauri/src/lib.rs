use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{env, fs, path::PathBuf};

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

#[derive(Debug, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
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
async fn recommend_books(messages: Vec<ChatMessage>) -> Result<String, String> {
    let api_key = read_local_var("OPENROUTER_API_KEY").ok_or_else(|| {
        "缺少 OPENROUTER_API_KEY。请在环境变量或项目根目录 .dev.vars 中配置。".to_string()
    })?;
    let model = read_local_var("OPENROUTER_MODEL")
        .unwrap_or_else(|| "deepseek/deepseek-v4-flash".to_string());
    let base_url = read_local_var("OPENROUTER_BASE_URL")
        .unwrap_or_else(|| "https://openrouter.ai/api/v1/chat/completions".to_string());

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
        .post(base_url)
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "tauri://book-agent")
        .header("X-Title", "Book Agent")
        .json(&serde_json::json!({
            "model": model,
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

fn read_local_var(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| read_dev_vars(name))
}

fn read_dev_vars(name: &str) -> Option<String> {
    dev_var_paths().into_iter().find_map(|path| {
        let contents = fs::read_to_string(path).ok()?;

        contents.lines().find_map(|line| parse_env_line(line, name))
    })
}

fn dev_var_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Ok(current_dir) = env::current_dir() {
        paths.push(current_dir.join(".dev.vars"));
        paths.push(current_dir.join("..").join(".dev.vars"));
    }

    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            paths.push(exe_dir.join(".dev.vars"));
            paths.push(exe_dir.join("..").join(".dev.vars"));
            paths.push(exe_dir.join("..").join("..").join(".dev.vars"));
        }
    }

    paths
}

fn parse_env_line(line: &str, name: &str) -> Option<String> {
    let trimmed = line.trim();

    if trimmed.is_empty() || trimmed.starts_with('#') {
        return None;
    }

    let (key, value) = trimmed.split_once('=')?;

    if key.trim() != name {
        return None;
    }

    let value = value
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .to_string();

    if value.is_empty() {
        None
    } else {
        Some(value)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![recommend_books])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
