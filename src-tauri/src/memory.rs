use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::Manager;

#[cfg(test)]
use crate::chat::ChatMessage;

pub(crate) const USER_MEMORY_SCHEMA_VERSION: u32 = 1;

const USER_MEMORY_FILE_NAME: &str = "user-memory.json";
const PREFERENCE_MEMORY_FILE_NAME: &str = "preference-memory.json";
const MAX_MEMORY_QUERIES: usize = 24;
const MAX_RECENT_PROMPTS: usize = 24;
const MAX_NOTES: usize = 40;
const MAX_PLANS: usize = 12;
const MAX_SUMMARY_CHARS: usize = 800;
const MAX_QUERY_CHARS: usize = 180;
const MAX_NOTE_CHARS: usize = 180;
const MAX_PLAN_TITLE_CHARS: usize = 120;
const MAX_PLAN_GOAL_CHARS: usize = 360;
const MAX_PLAN_EVIDENCE_CHARS: usize = 240;
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

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UserMemory {
    #[serde(default = "default_user_memory_schema_version")]
    pub(crate) schema_version: u32,
    #[serde(default)]
    pub(crate) profile: ProfileMemory,
    #[serde(default)]
    pub(crate) plans: Vec<ReadingPlanMemory>,
    #[serde(default)]
    pub(crate) evidence: EvidenceMemory,
}

impl Default for UserMemory {
    fn default() -> Self {
        Self {
            schema_version: USER_MEMORY_SCHEMA_VERSION,
            profile: ProfileMemory::default(),
            plans: Vec::new(),
            evidence: EvidenceMemory::default(),
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProfileMemory {
    #[serde(default)]
    pub(crate) summary: String,
    #[serde(default)]
    pub(crate) learned_categories: Vec<String>,
    #[serde(default)]
    pub(crate) notes: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EvidenceMemory {
    #[serde(default)]
    pub(crate) recent_prompts: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadingPlanMemory {
    #[serde(default)]
    pub(crate) id: String,
    #[serde(default)]
    pub(crate) title: String,
    #[serde(default)]
    pub(crate) goal: String,
    #[serde(default = "default_reading_plan_status")]
    pub(crate) status: ReadingPlanStatus,
    #[serde(default)]
    pub(crate) evidence: String,
    #[serde(default)]
    pub(crate) updated_at: i64,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ReadingPlanStatus {
    Active,
    Paused,
    Done,
}

impl Default for ReadingPlanStatus {
    fn default() -> Self {
        Self::Active
    }
}

#[derive(Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MemoryExtraction {
    #[serde(default)]
    pub(crate) preference_summary: Option<String>,
    #[serde(default)]
    pub(crate) learned_categories: Vec<String>,
    #[serde(default)]
    pub(crate) preference_notes: Vec<String>,
    #[serde(default)]
    pub(crate) plans: Vec<ReadingPlanPatch>,
}

#[derive(Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadingPlanPatch {
    #[serde(default)]
    pub(crate) title: String,
    #[serde(default)]
    pub(crate) goal: String,
    #[serde(default)]
    pub(crate) status: Option<ReadingPlanStatus>,
    #[serde(default)]
    pub(crate) evidence: String,
}

struct PreferenceCategoryRule {
    label: &'static str,
    keywords: &'static [&'static str],
}

pub(crate) fn user_memory_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取记忆目录失败：{error}"))?;

    Ok(app_data_dir.join(USER_MEMORY_FILE_NAME))
}

pub(crate) fn preference_memory_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取记忆目录失败：{error}"))?;

    Ok(app_data_dir.join(PREFERENCE_MEMORY_FILE_NAME))
}

pub(crate) fn load_user_memory(path: &Path, legacy_path: &Path) -> Result<UserMemory, String> {
    match fs::read_to_string(path) {
        Ok(content) if content.trim().is_empty() => Ok(UserMemory::default()),
        Ok(content) => serde_json::from_str::<UserMemory>(&content)
            .map(normalize_user_memory)
            .map_err(|error| format!("读取用户记忆失败：{error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            load_preference_memory(legacy_path).map(preference_memory_to_user_memory)
        }
        Err(error) => Err(format!("读取用户记忆失败：{error}")),
    }
}

pub(crate) fn save_user_memory(path: &Path, memory: &UserMemory) -> Result<UserMemory, String> {
    let memory = normalize_user_memory(memory.clone());

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建记忆目录失败：{error}"))?;
    }

    let content = serde_json::to_string_pretty(&memory)
        .map_err(|error| format!("序列化用户记忆失败：{error}"))?;

    fs::write(path, content).map_err(|error| format!("写入用户记忆失败：{error}"))?;

    Ok(memory)
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

#[cfg(test)]
pub(crate) fn save_preference_memory(path: &Path, memory: &PreferenceMemory) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建记忆目录失败：{error}"))?;
    }

    let content = serde_json::to_string_pretty(memory)
        .map_err(|error| format!("序列化偏好记忆失败：{error}"))?;

    fs::write(path, content).map_err(|error| format!("写入偏好记忆失败：{error}"))
}

#[cfg(test)]
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

pub(crate) fn preference_memory_from_user_memory(memory: &UserMemory) -> PreferenceMemory {
    PreferenceMemory {
        queries: memory.evidence.recent_prompts.clone(),
        summary: memory.profile.summary.clone(),
    }
}

pub(crate) fn merge_memory_extraction(
    memory: &mut UserMemory,
    extraction: MemoryExtraction,
    prompt: &str,
    updated_at: i64,
) {
    *memory = normalize_user_memory(memory.clone());

    if let Some(summary) = extraction.preference_summary {
        let summary = normalize_memory_text(&summary, MAX_SUMMARY_CHARS);

        if !summary.is_empty() {
            memory.profile.summary = summary;
        }
    }

    extend_unique(
        &mut memory.profile.learned_categories,
        extraction.learned_categories,
        usize::MAX,
        MAX_NOTE_CHARS,
    );
    extend_unique(
        &mut memory.profile.notes,
        extraction.preference_notes,
        MAX_NOTES,
        MAX_NOTE_CHARS,
    );

    for patch in extraction.plans {
        merge_plan(memory, patch, updated_at);
    }

    let prompt = normalize_memory_text(prompt, MAX_QUERY_CHARS);

    if !prompt.is_empty() && !memory.evidence.recent_prompts.contains(&prompt) {
        memory.evidence.recent_prompts.push(prompt);
    }

    if memory.evidence.recent_prompts.len() > MAX_RECENT_PROMPTS {
        memory.evidence.recent_prompts = memory
            .evidence
            .recent_prompts
            .split_off(memory.evidence.recent_prompts.len() - MAX_RECENT_PROMPTS);
    }

    *memory = normalize_user_memory(memory.clone());
}

pub(crate) fn parse_memory_extraction(content: &str) -> Result<MemoryExtraction, String> {
    let content = extract_json_object(content);

    serde_json::from_str::<MemoryExtraction>(content)
        .map_err(|error| format!("解析记忆提取结果失败：{error}"))
}

fn normalize_user_memory(mut memory: UserMemory) -> UserMemory {
    memory.schema_version = USER_MEMORY_SCHEMA_VERSION;
    memory.profile.summary = normalize_memory_text(&memory.profile.summary, MAX_SUMMARY_CHARS);
    memory.profile.learned_categories = normalize_string_list(
        memory.profile.learned_categories,
        usize::MAX,
        MAX_NOTE_CHARS,
    );
    memory.profile.notes = normalize_string_list(memory.profile.notes, MAX_NOTES, MAX_NOTE_CHARS);
    memory.plans = normalize_plans(memory.plans);
    memory.evidence.recent_prompts = normalize_string_list(
        memory.evidence.recent_prompts,
        MAX_RECENT_PROMPTS,
        MAX_QUERY_CHARS,
    );
    memory
}

fn normalize_preference_memory(mut memory: PreferenceMemory) -> PreferenceMemory {
    memory.queries = normalize_string_list(memory.queries, MAX_MEMORY_QUERIES, MAX_QUERY_CHARS);
    memory.summary = summarize_preference_queries(&memory.queries);
    memory
}

fn preference_memory_to_user_memory(memory: PreferenceMemory) -> UserMemory {
    let memory = normalize_preference_memory(memory);

    normalize_user_memory(UserMemory {
        profile: ProfileMemory {
            summary: memory.summary,
            learned_categories: Vec::new(),
            notes: Vec::new(),
        },
        evidence: EvidenceMemory {
            recent_prompts: memory.queries,
        },
        ..UserMemory::default()
    })
}

fn normalize_plans(plans: Vec<ReadingPlanMemory>) -> Vec<ReadingPlanMemory> {
    let mut normalized_plans = Vec::new();

    for plan in plans {
        let goal = normalize_memory_text(&plan.goal, MAX_PLAN_GOAL_CHARS);
        let title = normalize_memory_text(&plan.title, MAX_PLAN_TITLE_CHARS);
        let title = if title.is_empty() {
            goal.chars().take(40).collect::<String>()
        } else {
            title
        };

        if title.is_empty()
            || goal.is_empty()
            || normalized_plans
                .iter()
                .any(|entry: &ReadingPlanMemory| entry.title == title)
        {
            continue;
        }

        normalized_plans.push(ReadingPlanMemory {
            id: normalize_memory_text(&plan.id, 80).if_empty_then(|| make_plan_id(&title)),
            title,
            goal,
            status: plan.status,
            evidence: normalize_memory_text(&plan.evidence, MAX_PLAN_EVIDENCE_CHARS),
            updated_at: plan.updated_at.max(0),
        });

        if normalized_plans.len() >= MAX_PLANS {
            break;
        }
    }

    normalized_plans
}

fn merge_plan(memory: &mut UserMemory, patch: ReadingPlanPatch, updated_at: i64) {
    let goal = normalize_memory_text(&patch.goal, MAX_PLAN_GOAL_CHARS);
    let title = normalize_memory_text(&patch.title, MAX_PLAN_TITLE_CHARS);
    let title = if title.is_empty() {
        goal.chars().take(40).collect::<String>()
    } else {
        title
    };

    if title.is_empty() || goal.is_empty() {
        return;
    }

    if let Some(plan) = memory.plans.iter_mut().find(|plan| plan.title == title) {
        plan.goal = goal;
        plan.status = patch.status.unwrap_or(plan.status);
        plan.evidence = normalize_memory_text(&patch.evidence, MAX_PLAN_EVIDENCE_CHARS);
        plan.updated_at = updated_at.max(0);
        return;
    }

    if memory.plans.len() >= MAX_PLANS {
        memory.plans.remove(0);
    }

    memory.plans.push(ReadingPlanMemory {
        id: make_plan_id(&title),
        title,
        goal,
        status: patch.status.unwrap_or_default(),
        evidence: normalize_memory_text(&patch.evidence, MAX_PLAN_EVIDENCE_CHARS),
        updated_at: updated_at.max(0),
    });
}

fn extend_unique(
    target: &mut Vec<String>,
    values: Vec<String>,
    max_items: usize,
    max_chars: usize,
) {
    for value in values {
        let value = normalize_memory_text(&value, max_chars);

        if value.is_empty() || target.contains(&value) {
            continue;
        }

        target.push(value);

        if target.len() >= max_items {
            break;
        }
    }
}

fn normalize_string_list(values: Vec<String>, max_items: usize, max_chars: usize) -> Vec<String> {
    let mut normalized = Vec::new();
    extend_unique(&mut normalized, values, max_items, max_chars);
    normalized
}

#[cfg(test)]
fn normalize_memory_query(query: &str) -> String {
    normalize_memory_text(query, MAX_QUERY_CHARS)
}

fn normalize_memory_text(value: &str, max_chars: usize) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(max_chars)
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

fn make_plan_id(title: &str) -> String {
    let mut hash = 0xcbf29ce484222325_u64;

    for byte in title.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    format!("plan-{hash:x}")
}

fn extract_json_object(content: &str) -> &str {
    let trimmed = content.trim();
    let start = trimmed.find('{');
    let end = trimmed.rfind('}');

    match (start, end) {
        (Some(start), Some(end)) if start <= end => &trimmed[start..=end],
        _ => trimmed,
    }
}

fn default_user_memory_schema_version() -> u32 {
    USER_MEMORY_SCHEMA_VERSION
}

fn default_reading_plan_status() -> ReadingPlanStatus {
    ReadingPlanStatus::Active
}

trait EmptyStringFallback {
    fn if_empty_then(self, fallback: impl FnOnce() -> String) -> String;
}

impl EmptyStringFallback for String {
    fn if_empty_then(self, fallback: impl FnOnce() -> String) -> String {
        if self.is_empty() {
            fallback()
        } else {
            self
        }
    }
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

    #[test]
    fn user_memory_normalizes_profile_plans_and_evidence() {
        let memory = normalize_user_memory(UserMemory {
            schema_version: 9,
            profile: ProfileMemory {
                summary: "  喜欢心理成长和商业管理  ".to_string(),
                learned_categories: vec![
                    " 心理成长 ".to_string(),
                    "心理成长".to_string(),
                    "商业管理".to_string(),
                ],
                notes: vec![
                    " 喜欢案例型推荐 ".to_string(),
                    "".to_string(),
                    "喜欢案例型推荐".to_string(),
                    "避免太学术".to_string(),
                ],
            },
            plans: vec![
                ReadingPlanMemory {
                    id: " plan-a ".to_string(),
                    title: " 建立压力管理阅读计划 ".to_string(),
                    goal: " 用 4 周读完三本心理成长书 ".to_string(),
                    status: ReadingPlanStatus::Active,
                    evidence: " 用户明确提到工作压力 ".to_string(),
                    updated_at: 1_700_000_000_000,
                },
                ReadingPlanMemory {
                    id: "".to_string(),
                    title: "".to_string(),
                    goal: "".to_string(),
                    status: ReadingPlanStatus::Paused,
                    evidence: "".to_string(),
                    updated_at: 0,
                },
            ],
            evidence: EvidenceMemory {
                recent_prompts: vec![
                    " 想读压力管理 ".to_string(),
                    "想读压力管理".to_string(),
                    "了解创业".to_string(),
                ],
            },
        });

        assert_eq!(memory.schema_version, USER_MEMORY_SCHEMA_VERSION);
        assert_eq!(memory.profile.summary, "喜欢心理成长和商业管理");
        assert_eq!(
            memory.profile.learned_categories,
            vec!["心理成长", "商业管理"]
        );
        assert_eq!(memory.profile.notes, vec!["喜欢案例型推荐", "避免太学术"]);
        assert_eq!(memory.plans.len(), 1);
        assert_eq!(memory.plans[0].id, "plan-a");
        assert_eq!(memory.plans[0].title, "建立压力管理阅读计划");
        assert_eq!(memory.plans[0].status, ReadingPlanStatus::Active);
        assert_eq!(
            memory.evidence.recent_prompts,
            vec!["想读压力管理", "了解创业"]
        );
    }

    #[test]
    fn user_memory_merges_extraction_with_existing_plans() {
        let mut memory = UserMemory::default();
        memory.plans.push(ReadingPlanMemory {
            id: "plan-existing".to_string(),
            title: "压力管理阅读计划".to_string(),
            goal: "先读压力管理入门书".to_string(),
            status: ReadingPlanStatus::Active,
            evidence: "旧证据".to_string(),
            updated_at: 1,
        });

        merge_memory_extraction(
            &mut memory,
            MemoryExtraction {
                preference_summary: Some("偏好案例型心理成长书".to_string()),
                learned_categories: vec!["心理成长".to_string()],
                preference_notes: vec!["喜欢可执行建议".to_string()],
                plans: vec![ReadingPlanPatch {
                    title: "压力管理阅读计划".to_string(),
                    goal: "4 周读完三本压力管理书".to_string(),
                    status: Some(ReadingPlanStatus::Active),
                    evidence: "用户明确说要制定计划".to_string(),
                }],
            },
            " 帮我做一个压力管理阅读计划 ",
            1_700_000_000_000,
        );

        assert_eq!(memory.profile.summary, "偏好案例型心理成长书");
        assert_eq!(memory.profile.learned_categories, vec!["心理成长"]);
        assert_eq!(memory.profile.notes, vec!["喜欢可执行建议"]);
        assert_eq!(memory.plans.len(), 1);
        assert_eq!(memory.plans[0].id, "plan-existing");
        assert_eq!(memory.plans[0].goal, "4 周读完三本压力管理书");
        assert_eq!(memory.plans[0].evidence, "用户明确说要制定计划");
        assert_eq!(memory.plans[0].updated_at, 1_700_000_000_000);
        assert_eq!(
            memory.evidence.recent_prompts,
            vec!["帮我做一个压力管理阅读计划"]
        );
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
