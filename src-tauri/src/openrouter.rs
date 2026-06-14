use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    chat::ChatMessage,
    config::{OpenRouterConfig, UserPreferences},
    memory::PreferenceMemory,
};

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

#[derive(Debug, Serialize)]
pub(crate) struct OpenRouterMessage {
    pub(crate) role: String,
    pub(crate) content: String,
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

pub(crate) fn build_openrouter_messages(
    messages: Vec<ChatMessage>,
    preference_memory: &PreferenceMemory,
    preferences: &UserPreferences,
) -> Vec<OpenRouterMessage> {
    let mut openrouter_messages = vec![OpenRouterMessage {
        role: "system".to_string(),
        content: SYSTEM_PROMPT.to_string(),
    }];
    let latest_user_index = messages
        .iter()
        .rposition(|message| message.role == "user" && !message.content.trim().is_empty());

    openrouter_messages.extend(
        messages
            .into_iter()
            .enumerate()
            .filter_map(|(index, message)| {
                let role = match message.role.as_str() {
                    "user" => "user",
                    "assistant" => "assistant",
                    _ => return None,
                };
                let content = message.content.trim();

                if content.is_empty() {
                    None
                } else {
                    let content = if Some(index) == latest_user_index {
                        augment_user_query_with_memory(content, preference_memory, preferences)
                    } else {
                        content.to_string()
                    };

                    Some(OpenRouterMessage {
                        role: role.to_string(),
                        content,
                    })
                }
            }),
    );

    openrouter_messages
}

pub(crate) async fn request_book_recommendation(
    config: &OpenRouterConfig,
    messages: &[OpenRouterMessage],
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(&config.base_url)
        .bearer_auth(&config.api_key)
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "tauri://book-agent")
        .header("X-Title", "Book Agent")
        .json(&serde_json::json!({
            "model": &config.model,
            "messages": messages,
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

fn augment_user_query_with_memory(
    query: &str,
    preference_memory: &PreferenceMemory,
    preferences: &UserPreferences,
) -> String {
    let memory_text = build_query_memory_text(preference_memory, preferences);

    if memory_text.is_empty() {
        return query.to_string();
    }

    format!("用户偏好记忆：\n{memory_text}\n\n本轮用户输入：\n{query}")
}

fn build_query_memory_text(
    preference_memory: &PreferenceMemory,
    preferences: &UserPreferences,
) -> String {
    let mut memory_lines = Vec::new();
    let summary = preference_memory.summary.trim();

    if !summary.is_empty() {
        memory_lines.push(summary.to_string());
    }

    if !preferences.favorite_categories.is_empty() {
        memory_lines.push(format!(
            "显式偏好分类：{}。",
            preferences.favorite_categories.join("、")
        ));
    }

    memory_lines.join("\n")
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
    fn openrouter_messages_add_preference_memory_to_latest_user_query() {
        let messages = build_openrouter_messages(
            vec![
                ChatMessage {
                    role: "user".to_string(),
                    content: "之前想看压力管理".to_string(),
                },
                ChatMessage {
                    role: "assistant".to_string(),
                    content: "可以从心理成长类开始。".to_string(),
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: "现在推荐一本适合通勤读的书".to_string(),
                },
            ],
            &PreferenceMemory {
                queries: vec![],
                summary: "最近需求偏向心理成长、商业管理；关注压力管理、创业。".to_string(),
            },
            &UserPreferences::default(),
        );

        assert_eq!(messages[0].role, "system");
        assert_eq!(messages[1].content, "之前想看压力管理");
        assert!(messages[3].content.contains("用户偏好记忆"));
        assert!(messages[3]
            .content
            .contains("最近需求偏向心理成长、商业管理"));
        assert!(messages[3].content.contains("本轮用户输入："));
        assert!(messages[3].content.contains("现在推荐一本适合通勤读的书"));
    }

    #[test]
    fn openrouter_messages_add_selected_categories_to_latest_user_query() {
        let messages = build_openrouter_messages(
            vec![ChatMessage {
                role: "user".to_string(),
                content: "推荐一本适合周末读的书".to_string(),
            }],
            &PreferenceMemory::default(),
            &UserPreferences {
                favorite_categories: vec!["文学小说".to_string(), "心理成长".to_string()],
            },
        );

        assert!(messages[1].content.contains("用户偏好记忆"));
        assert!(messages[1]
            .content
            .contains("显式偏好分类：文学小说、心理成长"));
        assert!(messages[1].content.contains("推荐一本适合周末读的书"));
    }
}
