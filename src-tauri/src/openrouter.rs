use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    config::OpenRouterConfig,
    memory::{
        effective_profile_summary, parse_memory_extraction, MemoryExtraction, ReadingPlanStatus,
        UserMemory,
    },
};

#[cfg(test)]
use crate::memory::{EvidenceMemory, ProfileMemory, ReadingPlanMemory};

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
            content: r#"你是 JIAJIA 的长期记忆提取器。
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
        .header("X-Title", "JIAJIA")
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

fn build_memory_context(user_memory: &UserMemory) -> Option<String> {
    let mut memory_lines = Vec::new();
    let summary = effective_profile_summary(&user_memory.profile);

    if !summary.is_empty() {
        memory_lines.push(format!("偏好摘要：{summary}"));
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
        .take(3)
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
    let context = build_memory_context(user_memory);

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
    fn memory_extraction_messages_include_structured_memory_snapshot() {
        let messages = build_memory_extraction_messages(
            "现在推荐一本适合通勤读的书",
            &UserMemory {
                profile: ProfileMemory {
                    summary: String::new(),
                    user_summary: "偏好短章节".to_string(),
                    auto_summary: "偏好案例型心理成长和商业管理书".to_string(),
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
        );

        assert_eq!(messages[0].role, "system");
        assert_eq!(messages[1].role, "user");
        assert!(messages[0].content.contains("长期记忆提取器"));
        assert!(messages[1].content.contains("长期用户记忆"));
        assert!(messages[1]
            .content
            .contains("偏好短章节；偏好案例型心理成长和商业管理书"));
        assert!(messages[1].content.contains("模型学习分类：心理成长"));
        assert!(messages[1].content.contains("压力管理阅读计划"));
        assert!(messages[1].content.contains("之前想看压力管理"));
        assert!(messages[1].content.contains("现在推荐一本适合通勤读的书"));
    }

    #[test]
    fn memory_extraction_messages_use_empty_snapshot_for_empty_memory() {
        let messages =
            build_memory_extraction_messages("推荐一本适合周末读的书", &UserMemory::default());

        assert!(messages[1].content.contains("现有记忆：\n空"));
        assert!(messages[1].content.contains("推荐一本适合周末读的书"));
    }
}
