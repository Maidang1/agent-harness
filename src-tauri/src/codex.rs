use std::{collections::HashMap, path::PathBuf, process::Stdio, sync::Arc};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, Command},
    sync::Mutex,
};

use crate::{
    config::{CodexConfig, CodexSandboxMode},
    memory::{
        effective_profile_summary, parse_memory_extraction, MemoryExtraction, ReadingPlanStatus,
        UserMemory,
    },
};

const CODEX_RUN_EVENT: &str = "codex-run-event";
const THREAD_START_REQUEST_ID: i64 = 1;
const TURN_START_REQUEST_ID: i64 = 2;
const CODEX_DEVELOPER_INSTRUCTIONS: &str =
    "你是 JIAJIA 的模型后端。专注回答读书推荐问题，直接输出最终回复。保持在应用上下文内，凭输入文本作答。";

#[derive(Default)]
pub(crate) struct CodexRunState {
    runs: Mutex<HashMap<String, Arc<Mutex<Child>>>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodexAuthStatus {
    auth_mode: String,
    has_tokens: bool,
    has_refresh_token: bool,
    last_refresh: String,
    login_status: String,
}

#[derive(Clone)]
pub(crate) struct CodexRunRegistration {
    pub(crate) app_handle: AppHandle,
    pub(crate) run_id: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodexRunEvent {
    run_id: String,
    #[serde(rename = "type")]
    event_type: CodexRunEventType,
    #[serde(skip_serializing_if = "Option::is_none")]
    delta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
enum CodexRunEventType {
    Delta,
    Done,
    Error,
}

#[derive(Debug, Deserialize)]
struct StoredCodexAuth {
    #[serde(default)]
    auth_mode: String,
    #[serde(default)]
    tokens: Option<StoredCodexTokens>,
    #[serde(default)]
    last_refresh: String,
}

#[derive(Debug, Deserialize)]
struct StoredCodexTokens {
    #[serde(default)]
    refresh_token: String,
}

#[derive(Debug, PartialEq, Eq)]
enum AppServerEvent {
    ThreadStarted(String),
    Delta(String),
    TurnCompleted,
    TurnFailed(String),
    ResponseError(String),
    Other,
}

pub(crate) async fn get_codex_auth_status() -> Result<CodexAuthStatus, String> {
    let login_status = read_login_status().await;
    let auth = read_stored_auth();

    Ok(CodexAuthStatus {
        auth_mode: auth
            .as_ref()
            .map(|value| value.auth_mode.clone())
            .unwrap_or_default(),
        has_tokens: auth
            .as_ref()
            .and_then(|value| value.tokens.as_ref())
            .is_some(),
        has_refresh_token: auth
            .as_ref()
            .and_then(|value| value.tokens.as_ref())
            .map(|tokens| !tokens.refresh_token.trim().is_empty())
            .unwrap_or(false),
        last_refresh: auth
            .as_ref()
            .map(|value| value.last_refresh.clone())
            .unwrap_or_default(),
        login_status,
    })
}

pub(crate) async fn cancel_codex_run(
    state: tauri::State<'_, CodexRunState>,
    run_id: String,
) -> Result<(), String> {
    let child = {
        let mut runs = state.runs.lock().await;
        runs.remove(&run_id)
    };

    if let Some(child) = child {
        child
            .lock()
            .await
            .start_kill()
            .map_err(|error| format!("取消 Codex 运行失败：{error}"))?;
    }

    Ok(())
}

pub(crate) async fn start_codex_chat_run(
    app_handle: AppHandle,
    run_id: String,
    prompt: String,
    config: CodexConfig,
) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        let registration = CodexRunRegistration { app_handle, run_id };
        let event_target = registration.clone();
        let result = run_codex_prompt(
            &config,
            &prompt,
            None,
            |delta| emit_delta(&event_target, delta),
            Some(registration.clone()),
        )
        .await;

        match result {
            Ok(_) => emit_done(&registration),
            Err(error) => emit_error(&registration, &error),
        }
    });

    Ok(())
}

pub(crate) async fn request_memory_extraction(
    config: &CodexConfig,
    prompt: &str,
    user_memory: &UserMemory,
) -> Result<MemoryExtraction, String> {
    let prompt = build_memory_extraction_prompt(prompt, user_memory);
    let content = run_codex_prompt(
        config,
        &prompt,
        Some(memory_extraction_schema()),
        |_| {},
        None,
    )
    .await?;

    parse_memory_extraction(&content)
}

async fn run_codex_prompt<F>(
    config: &CodexConfig,
    prompt: &str,
    output_schema: Option<Value>,
    mut on_delta: F,
    registration: Option<CodexRunRegistration>,
) -> Result<String, String>
where
    F: FnMut(&str) + Send,
{
    let mut child = spawn_app_server(config).await?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Codex app-server stdin 不可用。".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Codex app-server stdout 不可用。".to_string())?;
    let stderr = child.stderr.take();
    let child = Arc::new(Mutex::new(child));

    if let Some(registration) = &registration {
        registration
            .app_handle
            .state::<CodexRunState>()
            .runs
            .lock()
            .await
            .insert(registration.run_id.clone(), Arc::clone(&child));
    }

    let stderr_tail = Arc::new(Mutex::new(Vec::<String>::new()));
    spawn_stderr_reader(stderr, Arc::clone(&stderr_tail));

    let result = run_jsonrpc_loop(
        config,
        prompt,
        output_schema,
        &mut stdin,
        stdout,
        &mut on_delta,
    )
    .await;

    cleanup_child(child, registration).await;

    match result {
        Ok(content) => Ok(content),
        Err(error) => {
            let stderr = stderr_tail.lock().await.join("\n");

            if stderr.trim().is_empty() {
                Err(error)
            } else {
                Err(format!("{error}\n{stderr}"))
            }
        }
    }
}

async fn spawn_app_server(config: &CodexConfig) -> Result<Child, String> {
    let mut command = Command::new(&config.codex_path);
    command
        .arg("app-server")
        .arg("--stdio")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if !config.cwd.trim().is_empty() {
        command.current_dir(&config.cwd);
    }

    command
        .spawn()
        .map_err(|error| format!("启动 Codex app-server 失败：{error}"))
}

async fn run_jsonrpc_loop<F>(
    config: &CodexConfig,
    prompt: &str,
    output_schema: Option<Value>,
    stdin: &mut tokio::process::ChildStdin,
    stdout: tokio::process::ChildStdout,
    on_delta: &mut F,
) -> Result<String, String>
where
    F: FnMut(&str) + Send,
{
    send_json(stdin, initialize_request()).await?;
    send_json(stdin, json!({ "method": "initialized", "params": {} })).await?;
    send_json(stdin, thread_start_request(config)).await?;

    let mut lines = BufReader::new(stdout).lines();
    let mut content = String::new();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|error| format!("读取 Codex app-server 输出失败：{error}"))?
    {
        let value = serde_json::from_str::<Value>(&line)
            .map_err(|error| format!("解析 Codex app-server JSONL 失败：{error}"))?;

        match parse_app_server_event(&value) {
            AppServerEvent::ThreadStarted(thread_id) => {
                send_json(
                    stdin,
                    turn_start_request(&thread_id, prompt, config, output_schema.clone()),
                )
                .await?;
            }
            AppServerEvent::Delta(delta) => {
                content.push_str(&delta);
                on_delta(&delta);
            }
            AppServerEvent::TurnCompleted => {
                return Ok(content);
            }
            AppServerEvent::TurnFailed(error) | AppServerEvent::ResponseError(error) => {
                return Err(error);
            }
            AppServerEvent::Other => {}
        }
    }

    Err("Codex app-server 提前结束。".to_string())
}

fn initialize_request() -> Value {
    json!({
        "method": "initialize",
        "id": 0,
        "params": {
            "clientInfo": {
                "name": "book_agent",
                "title": "JIAJIA",
                "version": env!("CARGO_PKG_VERSION")
            }
        }
    })
}

fn thread_start_request(config: &CodexConfig) -> Value {
    let mut params = json!({
        "ephemeral": true,
        "cwd": config.cwd,
        "sandbox": sandbox_value(config.sandbox),
        "approvalPolicy": "never",
        "developerInstructions": CODEX_DEVELOPER_INSTRUCTIONS
    });

    if let Some(model) = &config.model {
        params["model"] = Value::String(model.clone());
    }

    json!({
        "method": "thread/start",
        "id": THREAD_START_REQUEST_ID,
        "params": params
    })
}

fn turn_start_request(
    thread_id: &str,
    prompt: &str,
    config: &CodexConfig,
    output_schema: Option<Value>,
) -> Value {
    let mut params = json!({
        "threadId": thread_id,
        "input": [
            {
                "type": "text",
                "text": prompt
            }
        ],
        "cwd": config.cwd,
        "sandboxPolicy": sandbox_policy_value(config.sandbox),
        "approvalPolicy": "never"
    });

    if let Some(model) = &config.model {
        params["model"] = Value::String(model.clone());
    }

    if let Some(schema) = output_schema {
        params["outputSchema"] = schema;
    }

    json!({
        "method": "turn/start",
        "id": TURN_START_REQUEST_ID,
        "params": params
    })
}

fn sandbox_value(sandbox: CodexSandboxMode) -> &'static str {
    match sandbox {
        CodexSandboxMode::ReadOnly => "read-only",
    }
}

fn sandbox_policy_value(sandbox: CodexSandboxMode) -> Value {
    match sandbox {
        CodexSandboxMode::ReadOnly => json!({
            "type": "readOnly",
            "networkAccess": false
        }),
    }
}

async fn send_json(stdin: &mut tokio::process::ChildStdin, value: Value) -> Result<(), String> {
    let line =
        serde_json::to_string(&value).map_err(|error| format!("序列化 Codex 请求失败：{error}"))?;

    stdin
        .write_all(line.as_bytes())
        .await
        .map_err(|error| format!("写入 Codex app-server 失败：{error}"))?;
    stdin
        .write_all(b"\n")
        .await
        .map_err(|error| format!("写入 Codex app-server 失败：{error}"))?;
    stdin
        .flush()
        .await
        .map_err(|error| format!("刷新 Codex app-server 输入失败：{error}"))
}

fn parse_app_server_event(value: &Value) -> AppServerEvent {
    if value.get("id").and_then(Value::as_i64) == Some(THREAD_START_REQUEST_ID) {
        if let Some(error) = response_error(value) {
            return AppServerEvent::ResponseError(error);
        }

        if let Some(thread_id) = value
            .get("result")
            .and_then(|result| result.get("thread"))
            .and_then(|thread| thread.get("id"))
            .and_then(Value::as_str)
        {
            return AppServerEvent::ThreadStarted(thread_id.to_string());
        }
    }

    if value.get("id").and_then(Value::as_i64) == Some(TURN_START_REQUEST_ID) {
        if let Some(error) = response_error(value) {
            return AppServerEvent::ResponseError(error);
        }
    }

    match value.get("method").and_then(Value::as_str) {
        Some("item/agentMessage/delta") => value
            .get("params")
            .and_then(|params| params.get("delta"))
            .and_then(Value::as_str)
            .map(|delta| AppServerEvent::Delta(delta.to_string()))
            .unwrap_or(AppServerEvent::Other),
        Some("turn/completed") => parse_turn_completed(value),
        Some("error") => AppServerEvent::TurnFailed(
            value
                .get("params")
                .and_then(|params| params.get("error"))
                .and_then(turn_error_message)
                .unwrap_or_else(|| "Codex 返回未知错误。".to_string()),
        ),
        _ => AppServerEvent::Other,
    }
}

fn parse_turn_completed(value: &Value) -> AppServerEvent {
    let turn = value
        .get("params")
        .and_then(|params| params.get("turn"))
        .unwrap_or(&Value::Null);
    let status = turn
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or_default();

    match status {
        "completed" => AppServerEvent::TurnCompleted,
        "failed" => AppServerEvent::TurnFailed(
            turn.get("error")
                .and_then(turn_error_message)
                .unwrap_or_else(|| "Codex turn failed。".to_string()),
        ),
        "interrupted" => AppServerEvent::TurnFailed("Codex turn interrupted。".to_string()),
        _ => AppServerEvent::Other,
    }
}

fn response_error(value: &Value) -> Option<String> {
    value
        .get("error")
        .and_then(|error| error.get("message").or_else(|| error.get("code")))
        .map(value_to_message)
}

fn turn_error_message(value: &Value) -> Option<String> {
    value
        .get("message")
        .or_else(|| value.get("reason"))
        .or_else(|| value.get("codexErrorInfo"))
        .map(value_to_message)
}

fn value_to_message(value: &Value) -> String {
    value
        .as_str()
        .map(ToString::to_string)
        .unwrap_or_else(|| value.to_string())
}

fn spawn_stderr_reader(
    stderr: Option<tokio::process::ChildStderr>,
    stderr_tail: Arc<Mutex<Vec<String>>>,
) {
    if let Some(stderr) = stderr {
        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();

            while let Ok(Some(line)) = lines.next_line().await {
                let mut tail = stderr_tail.lock().await;
                tail.push(line);

                if tail.len() > 20 {
                    tail.remove(0);
                }
            }
        });
    }
}

async fn cleanup_child(child: Arc<Mutex<Child>>, registration: Option<CodexRunRegistration>) {
    if let Some(registration) = registration {
        registration
            .app_handle
            .state::<CodexRunState>()
            .runs
            .lock()
            .await
            .remove(&registration.run_id);
    }

    let mut child = child.lock().await;
    let _ = child.start_kill();
    let _ = child.wait().await;
}

fn emit_delta(registration: &CodexRunRegistration, delta: &str) {
    emit_event(
        registration,
        CodexRunEventType::Delta,
        Some(delta.to_string()),
        None,
    );
}

fn emit_done(registration: &CodexRunRegistration) {
    emit_event(registration, CodexRunEventType::Done, None, None);
}

fn emit_error(registration: &CodexRunRegistration, error: &str) {
    emit_event(
        registration,
        CodexRunEventType::Error,
        None,
        Some(error.to_string()),
    );
}

fn emit_event(
    registration: &CodexRunRegistration,
    event_type: CodexRunEventType,
    delta: Option<String>,
    error: Option<String>,
) {
    let _ = registration.app_handle.emit(
        CODEX_RUN_EVENT,
        CodexRunEvent {
            run_id: registration.run_id.clone(),
            event_type,
            delta,
            error,
        },
    );
}

async fn read_login_status() -> String {
    match Command::new("codex")
        .arg("login")
        .arg("status")
        .output()
        .await
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

            if stdout.is_empty() {
                stderr
            } else {
                stdout
            }
        }
        Err(error) => format!("读取 Codex 登录状态失败：{error}"),
    }
}

fn read_stored_auth() -> Option<StoredCodexAuth> {
    let path = codex_auth_path()?;
    let content = std::fs::read_to_string(path).ok()?;

    serde_json::from_str(&content).ok()
}

fn codex_auth_path() -> Option<PathBuf> {
    if let Ok(codex_home) = std::env::var("CODEX_HOME") {
        return Some(PathBuf::from(codex_home).join("auth.json"));
    }

    std::env::var("HOME")
        .ok()
        .map(|home| PathBuf::from(home).join(".codex/auth.json"))
}

fn build_memory_extraction_prompt(prompt: &str, user_memory: &UserMemory) -> String {
    format!(
        r#"你是 JIAJIA 的长期记忆提取器。
只从用户输入中提取稳定阅读偏好、明确读书计划和可复用证据。
忽略一次性闲聊、敏感隐私、无关个人信息。
只返回 JSON 对象，字段为：
{{
  "preferenceSummary": string | null,
  "learnedCategories": string[],
  "preferenceNotes": string[],
  "plans": [{{"title": string, "goal": string, "status": "active" | "paused" | "done", "evidence": string}}]
}}

现有记忆：
{}

用户输入：
{}"#,
        build_memory_snapshot(user_memory),
        prompt.trim()
    )
}

fn build_memory_snapshot(user_memory: &UserMemory) -> String {
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

    if recent_prompts.is_empty() {
        memory_lines.push("近期需求：空。".to_string());
    } else {
        memory_lines.push(format!("近期需求：{}。", recent_prompts.join("；")));
    }

    if memory_lines.is_empty() {
        "空".to_string()
    } else {
        memory_lines.join("\n")
    }
}

fn memory_extraction_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "preferenceSummary": {
                "type": ["string", "null"]
            },
            "learnedCategories": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "preferenceNotes": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "plans": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "goal": {
                            "type": "string"
                        },
                        "status": {
                            "type": "string",
                            "enum": ["active", "paused", "done"]
                        },
                        "evidence": {
                            "type": "string"
                        }
                    },
                    "required": ["title", "goal", "status", "evidence"],
                    "additionalProperties": false
                }
            }
        },
        "required": ["preferenceSummary", "learnedCategories", "preferenceNotes", "plans"],
        "additionalProperties": false
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::{EvidenceMemory, ProfileMemory, ReadingPlanMemory};

    #[test]
    fn parses_thread_started_response() {
        let value = json!({
            "id": 1,
            "result": {
                "thread": {
                    "id": "thread-1"
                }
            }
        });

        assert_eq!(
            parse_app_server_event(&value),
            AppServerEvent::ThreadStarted("thread-1".to_string())
        );
    }

    #[test]
    fn parses_agent_message_delta_notification() {
        let value = json!({
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "推荐《原则》。"
            }
        });

        assert_eq!(
            parse_app_server_event(&value),
            AppServerEvent::Delta("推荐《原则》。".to_string())
        );
    }

    #[test]
    fn parses_failed_turn_message() {
        let value = json!({
            "method": "turn/completed",
            "params": {
                "turn": {
                    "id": "turn-1",
                    "items": [],
                    "status": "failed",
                    "error": {
                        "message": "unauthorized"
                    }
                }
            }
        });

        assert_eq!(
            parse_app_server_event(&value),
            AppServerEvent::TurnFailed("unauthorized".to_string())
        );
    }

    #[test]
    fn builds_memory_prompt_with_snapshot() {
        let memory = UserMemory {
            profile: ProfileMemory {
                summary: String::new(),
                user_summary: "偏好案例型书单".to_string(),
                auto_summary: "偏好商业管理".to_string(),
                learned_categories: vec!["商业管理".to_string()],
                notes: vec!["喜欢案例".to_string()],
            },
            plans: vec![ReadingPlanMemory {
                id: "plan-a".to_string(),
                title: "读完管理书".to_string(),
                goal: "建立管理框架".to_string(),
                status: ReadingPlanStatus::Active,
                evidence: "用户主动提到管理".to_string(),
                updated_at: 1,
            }],
            evidence: EvidenceMemory {
                recent_prompts: vec!["找管理书".to_string()],
            },
            ..UserMemory::default()
        };

        let prompt = build_memory_extraction_prompt("推荐书", &memory);

        assert!(prompt.contains("偏好案例型书单；偏好商业管理"));
        assert!(prompt.contains("读完管理书"));
        assert!(prompt.contains("推荐书"));
    }

    #[test]
    fn turn_start_request_uses_app_server_sandbox_policy_shape() {
        let config = CodexConfig {
            model: Some("gpt-5.4".to_string()),
            codex_path: "codex".to_string(),
            cwd: "/tmp/book-agent".to_string(),
            sandbox: CodexSandboxMode::ReadOnly,
        };

        let request = turn_start_request("thread-1", "推荐书", &config, None);
        let params = request.get("params").unwrap();

        assert_eq!(
            params.get("sandboxPolicy"),
            Some(&json!({
                "type": "readOnly",
                "networkAccess": false
            }))
        );
        assert_eq!(params.get("model"), Some(&json!("gpt-5.4")));
    }
}
