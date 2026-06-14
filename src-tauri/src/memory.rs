use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::chat::ChatMessage;

const PREFERENCE_MEMORY_FILE_NAME: &str = "preference-memory.json";
const MAX_MEMORY_QUERIES: usize = 24;
const MAX_QUERY_CHARS: usize = 180;
const CATEGORY_RULES: &[PreferenceCategoryRule] = &[
    PreferenceCategoryRule {
        label: "文学小说",
        keywords: &["小说", "文学", "故事", "虚构", "名著", "散文"],
    },
    PreferenceCategoryRule {
        label: "商业管理",
        keywords: &["商业", "管理", "创业", "职场", "公司", "增长", "产品"],
    },
    PreferenceCategoryRule {
        label: "心理成长",
        keywords: &["心理", "成长", "压力", "焦虑", "情绪", "心态", "自我"],
    },
    PreferenceCategoryRule {
        label: "历史社科",
        keywords: &["历史", "社会", "政治", "经济", "文化", "哲学"],
    },
    PreferenceCategoryRule {
        label: "科技科普",
        keywords: &["科技", "科普", "科学", "AI", "人工智能", "技术", "编程"],
    },
    PreferenceCategoryRule {
        label: "传记纪实",
        keywords: &["传记", "人物", "纪实", "回忆录", "真实"],
    },
];

#[derive(Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreferenceMemory {
    pub(crate) queries: Vec<String>,
    pub(crate) summary: String,
}

struct PreferenceCategoryRule {
    label: &'static str,
    keywords: &'static [&'static str],
}

pub(crate) fn preference_memory_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取记忆目录失败：{error}"))?;

    Ok(app_data_dir.join(PREFERENCE_MEMORY_FILE_NAME))
}

pub(crate) fn load_preference_memory(path: &Path) -> Result<PreferenceMemory, String> {
    match fs::read_to_string(path) {
        Ok(content) if content.trim().is_empty() => Ok(PreferenceMemory::default()),
        Ok(content) => serde_json::from_str::<PreferenceMemory>(&content)
            .map(normalize_preference_memory)
            .map_err(|error| format!("读取偏好记忆失败：{error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok(PreferenceMemory::default())
        }
        Err(error) => Err(format!("读取偏好记忆失败：{error}")),
    }
}

pub(crate) fn save_preference_memory(path: &Path, memory: &PreferenceMemory) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建记忆目录失败：{error}"))?;
    }

    let content = serde_json::to_string_pretty(memory)
        .map_err(|error| format!("序列化偏好记忆失败：{error}"))?;

    fs::write(path, content).map_err(|error| format!("写入偏好记忆失败：{error}"))
}

pub(crate) fn update_preference_memory(memory: &mut PreferenceMemory, messages: &[ChatMessage]) {
    for message in messages {
        if message.role != "user" {
            continue;
        }

        let query = normalize_memory_query(&message.content);

        if query.is_empty() || memory.queries.contains(&query) {
            continue;
        }

        memory.queries.push(query);
    }

    if memory.queries.len() > MAX_MEMORY_QUERIES {
        memory.queries = memory
            .queries
            .split_off(memory.queries.len() - MAX_MEMORY_QUERIES);
    }

    memory.summary = summarize_preference_queries(&memory.queries);
}

fn normalize_preference_memory(mut memory: PreferenceMemory) -> PreferenceMemory {
    let mut queries = Vec::new();

    for query in memory.queries {
        let query = normalize_memory_query(&query);

        if query.is_empty() || queries.contains(&query) {
            continue;
        }

        queries.push(query);
    }

    if queries.len() > MAX_MEMORY_QUERIES {
        queries = queries.split_off(queries.len() - MAX_MEMORY_QUERIES);
    }

    memory.queries = queries;
    memory.summary = summarize_preference_queries(&memory.queries);
    memory
}

fn normalize_memory_query(query: &str) -> String {
    query
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(MAX_QUERY_CHARS)
        .collect()
}

fn summarize_preference_queries(queries: &[String]) -> String {
    if queries.is_empty() {
        return String::new();
    }

    let categories = infer_preference_categories(queries);
    let recent_queries = queries
        .iter()
        .rev()
        .take(3)
        .cloned()
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>();
    let recent_summary = recent_queries.join("；");

    if categories.is_empty() {
        format!("最近需求：{recent_summary}。")
    } else {
        format!(
            "最近需求偏向{}；最近需求：{recent_summary}。",
            categories.join("、")
        )
    }
}

fn infer_preference_categories(queries: &[String]) -> Vec<String> {
    let joined_queries = queries.join("\n").to_lowercase();

    CATEGORY_RULES
        .iter()
        .filter(|rule| {
            rule.keywords
                .iter()
                .any(|keyword| joined_queries.contains(&keyword.to_lowercase()))
        })
        .map(|rule| rule.label.to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preference_memory_updates_from_user_queries_and_persists_to_disk() {
        let path = test_memory_path("updates");
        let mut memory = load_preference_memory(&path).unwrap();

        update_preference_memory(
            &mut memory,
            &[
                ChatMessage {
                    role: "user".to_string(),
                    content: "最近工作压力大，想读心理成长类的书".to_string(),
                },
                ChatMessage {
                    role: "assistant".to_string(),
                    content: "可以先读一些压力管理相关书籍。".to_string(),
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: "也想了解商业管理和创业".to_string(),
                },
            ],
        );
        save_preference_memory(&path, &memory).unwrap();

        let stored = load_preference_memory(&path).unwrap();

        assert_eq!(
            stored.queries,
            vec![
                "最近工作压力大，想读心理成长类的书".to_string(),
                "也想了解商业管理和创业".to_string(),
            ]
        );
        assert!(stored.summary.contains("心理成长"));
        assert!(stored.summary.contains("商业管理"));
        assert!(stored.summary.contains("最近需求"));
    }

    fn test_memory_path(name: &str) -> std::path::PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!(
            "book-agent-memory-{name}-{}.json",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        path
    }
}
