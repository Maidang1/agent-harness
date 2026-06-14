use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    chat::ChatMessage,
    config::{MemorySettings, OpenRouterConfig, UserPreferences},
    memory::{parse_memory_extraction, MemoryExtraction, ReadingPlanStatus, UserMemory},
};

#[cfg(test)]
use crate::memory::{EvidenceMemory, ProfileMemory, ReadingPlanMemory};

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
    user_memory: &UserMemory,
    preferences: &UserPreferences,
    memory_settings: &MemorySettings,
) -> Vec<OpenRouterMessage> {
    let mut openrouter_messages = vec![OpenRouterMessage {
        role: "system".to_string(),
        content: SYSTEM_PROMPT.to_string(),
    }];

    if let Some(memory_context) = build_memory_context(user_memory, preferences, memory_settings) {
        openrouter_messages.push(OpenRouterMessage {
            role: "system".to_string(),
            content: memory_context,
        });
    }

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

    openrouter_messages
}

pub(crate) async fn request_book_recommendation(
    config: &OpenRouterConfig,
    messages: &[OpenRouterMessage],
) -> Result<String, String> {
    request_chat_completion(config, messages).await
}

pub(crate) async fn request_memory_extraction(
    config: &OpenRouterConfig,
    prompt: &str,
    user_memory: &UserMemory,
) -> Result<MemoryExtraction, String> {
    let messages = build_memory_extraction_messages(prompt, user_memory);
    let content = request_chat_completion(config, &messages).await?;

    parse_memory_extraction(&content)
}

fn build_memory_extraction_messages(
    prompt: &str,
    user_memory: &UserMemory,
) -> Vec<OpenRouterMessage> {
    vec![
        OpenRouterMessage {
            role: "system".to_string(),
            content: r#"你是读书推荐 Agent 的长期记忆提取器。
只从用户输入中提取稳定阅读偏好、明确读书计划和可复用证据。
忽略一次性闲聊、敏感隐私、无关个人信息。
只返回 JSON 对象，字段为：
{
  "preferenceSummary": string | null,
  "learnedCategories": string[],
  "preferenceNotes": string[],
  "plans": [{"title": string, "goal": string, "status": "active" | "paused" | "done", "evidence": string}]
}"#
                .to_string(),
        },
        OpenRouterMessage {
            role: "user".to_string(),
            content: format!(
                "现有记忆：\n{}\n\n用户输入：\n{}",
                build_memory_snapshot(user_memory),
                prompt.trim()
            ),
        },
    ]
}

fn request_payload(model: &str, messages: &[OpenRouterMessage]) -> serde_json::Value {
    serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    })
}

async fn request_chat_completion(
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
        .json(&request_payload(&config.model, messages))
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

fn build_memory_context(
    user_memory: &UserMemory,
    preferences: &UserPreferences,
    memory_settings: &MemorySettings,
) -> Option<String> {
    if !memory_settings.enabled || !memory_settings.include_in_recommendations {
        return None;
    }

    let mut memory_lines = Vec::new();
    let summary = user_memory.profile.summary.trim();

    if !summary.is_empty() {
        memory_lines.push(format!("偏好摘要：{summary}"));
    }

    if !preferences.favorite_categories.is_empty() {
        memory_lines.push(format!(
            "显式偏好分类：{}。",
            preferences.favorite_categories.join("、")
        ));
    }

    if !user_memory.profile.learned_categories.is_empty() {
        memory_lines.push(format!(
            "模型学习分类：{}。",
            user_memory.profile.learned_categories.join("、")
        ));
    }

    if !user_memory.profile.notes.is_empty() {
        memory_lines.push(format!(
            "偏好备注：{}。",
            user_memory.profile.notes.join("；")
        ));
    }

    let active_plans = user_memory
        .plans
        .iter()
        .filter(|plan| plan.status == ReadingPlanStatus::Active)
        .collect::<Vec<_>>();

    if !active_plans.is_empty() {
        memory_lines.push("活跃读书计划：".to_string());

        for plan in active_plans {
            let evidence = if plan.evidence.trim().is_empty() {
                String::new()
            } else {
                format!("；依据：{}", plan.evidence.trim())
            };
            memory_lines.push(format!("- {}：{}{}", plan.title, plan.goal, evidence));
        }
    }

    let recent_prompts = user_memory
        .evidence
        .recent_prompts
        .iter()
        .rev()
        .take(3)
        .cloned()
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>();

    if !recent_prompts.is_empty() {
        memory_lines.push(format!("近期需求：{}。", recent_prompts.join("；")));
    }

    if memory_lines.is_empty() {
        None
    } else {
        Some(format!("长期用户记忆：\n{}", memory_lines.join("\n")))
    }
}

fn build_memory_snapshot(user_memory: &UserMemory) -> String {
    let context = build_memory_context(
        user_memory,
        &UserPreferences::default(),
        &MemorySettings::default(),
    );

    context.unwrap_or_else(|| "空".to_string())
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
    fn openrouter_messages_add_structured_memory_system_message() {
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
            &UserMemory {
                profile: ProfileMemory {
                    summary: "偏好案例型心理成长和商业管理书".to_string(),
                    learned_categories: vec!["心理成长".to_string()],
                    notes: vec!["喜欢可执行建议".to_string()],
                },
                plans: vec![ReadingPlanMemory {
                    id: "plan-a".to_string(),
                    title: "压力管理阅读计划".to_string(),
                    goal: "4 周读完三本压力管理书".to_string(),
                    status: ReadingPlanStatus::Active,
                    evidence: "用户明确提到工作压力".to_string(),
                    updated_at: 1_700_000_000_000,
                }],
                evidence: EvidenceMemory {
                    recent_prompts: vec!["之前想看压力管理".to_string()],
                },
                ..UserMemory::default()
            },
            &UserPreferences {
                favorite_categories: vec!["商业管理".to_string()],
            },
            &MemorySettings::default(),
        );

        assert_eq!(messages[0].role, "system");
        assert_eq!(messages[1].role, "system");
        assert!(messages[1].content.contains("长期用户记忆"));
        assert!(messages[1].content.contains("显式偏好分类：商业管理"));
        assert!(messages[1].content.contains("模型学习分类：心理成长"));
        assert!(messages[1].content.contains("压力管理阅读计划"));
        assert_eq!(messages[2].content, "之前想看压力管理");
        assert_eq!(messages[4].content, "现在推荐一本适合通勤读的书");
    }

    #[test]
    fn openrouter_messages_skip_memory_when_disabled() {
        let messages = build_openrouter_messages(
            vec![ChatMessage {
                role: "user".to_string(),
                content: "推荐一本适合周末读的书".to_string(),
            }],
            &UserMemory {
                profile: ProfileMemory {
                    summary: "偏好文学小说".to_string(),
                    ..ProfileMemory::default()
                },
                ..UserMemory::default()
            },
            &UserPreferences {
                favorite_categories: vec!["文学小说".to_string(), "心理成长".to_string()],
            },
            &MemorySettings {
                enabled: false,
                include_in_recommendations: true,
                auto_generate_from_prompt: true,
            },
        );

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[1].content, "推荐一本适合周末读的书");
    }
}
