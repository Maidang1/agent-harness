use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::Manager;

pub(crate) const WEREAD_SKILL_VERSION: &str = "1.0.3";
const WEREAD_GATEWAY_URL: &str = "https://i.weread.qq.com/api/agent/gateway";
const WEREAD_SNAPSHOT_FILE_NAME: &str = "weread-snapshot.json";
const READING_WORKSPACE_FILE_NAME: &str = "reading-workspace.json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadCommandConfig {
    pub(crate) wechat_api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadSnapshot {
    pub(crate) schema_version: u32,
    pub(crate) updated_at: i64,
    pub(crate) status: String,
    pub(crate) error_message: String,
    pub(crate) shelf: WereadShelfSummary,
    pub(crate) reading_stats: WereadReadingStats,
    pub(crate) notebooks: WereadNotebooksSummary,
    pub(crate) recommended_books: Vec<WereadRecommendedBook>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadShelfSummary {
    pub(crate) total_count: usize,
    pub(crate) book_count: usize,
    pub(crate) album_count: usize,
    pub(crate) mp_count: usize,
    pub(crate) public_count: usize,
    pub(crate) private_count: usize,
    pub(crate) finished_book_count: usize,
    pub(crate) reading_book_count: usize,
    pub(crate) recent_items: Vec<WereadShelfItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadShelfItem {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) category: String,
    pub(crate) cover: String,
    pub(crate) updated_at: i64,
    pub(crate) updated_at_label: String,
    pub(crate) is_finished: bool,
    pub(crate) is_private: bool,
    pub(crate) deep_link: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadReadingStats {
    pub(crate) mode: String,
    pub(crate) read_days: i64,
    pub(crate) total_read_time_seconds: i64,
    pub(crate) total_read_time_label: String,
    pub(crate) day_average_read_time_seconds: i64,
    pub(crate) day_average_read_time_label: String,
    pub(crate) prefer_categories: Vec<WereadPreferCategory>,
    pub(crate) longest_books: Vec<WereadLongestBook>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadPreferCategory {
    pub(crate) title: String,
    pub(crate) reading_time_seconds: i64,
    pub(crate) reading_time_label: String,
    pub(crate) reading_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadLongestBook {
    pub(crate) id: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) cover: String,
    pub(crate) read_time_seconds: i64,
    pub(crate) read_time_label: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadNotebooksSummary {
    pub(crate) total_book_count: i64,
    pub(crate) total_note_count: i64,
    pub(crate) books: Vec<WereadNotebookBook>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadNotebookBook {
    pub(crate) book_id: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) cover: String,
    pub(crate) review_count: i64,
    pub(crate) note_count: i64,
    pub(crate) bookmark_count: i64,
    pub(crate) total_note_count: i64,
    pub(crate) reading_progress: i64,
    pub(crate) marked_status: i64,
    pub(crate) sort: i64,
    pub(crate) sort_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadRecommendedBook {
    pub(crate) book_id: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) cover: String,
    pub(crate) category: String,
    pub(crate) intro: String,
    pub(crate) reason: String,
    pub(crate) rating: i64,
    pub(crate) deep_link: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadBookNotes {
    pub(crate) book_id: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) highlights: Vec<WereadHighlight>,
    pub(crate) reviews: Vec<WereadReviewNote>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadHighlight {
    pub(crate) id: String,
    pub(crate) book_id: String,
    pub(crate) chapter_uid: i64,
    pub(crate) chapter_title: String,
    pub(crate) text: String,
    pub(crate) created_at: i64,
    pub(crate) created_at_label: String,
    pub(crate) deep_link: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WereadReviewNote {
    pub(crate) id: String,
    pub(crate) content: String,
    pub(crate) chapter_name: String,
    pub(crate) created_at: i64,
    pub(crate) created_at_label: String,
    pub(crate) deep_link: String,
}

impl Default for WereadSnapshot {
    fn default() -> Self {
        Self {
            schema_version: 1,
            updated_at: 0,
            status: "empty".to_string(),
            error_message: String::new(),
            shelf: WereadShelfSummary::default(),
            reading_stats: WereadReadingStats::default(),
            notebooks: WereadNotebooksSummary::default(),
            recommended_books: Vec::new(),
        }
    }
}

impl Default for WereadReadingStats {
    fn default() -> Self {
        Self {
            mode: "monthly".to_string(),
            read_days: 0,
            total_read_time_seconds: 0,
            total_read_time_label: "0分钟".to_string(),
            day_average_read_time_seconds: 0,
            day_average_read_time_label: "0分钟".to_string(),
            prefer_categories: Vec::new(),
            longest_books: Vec::new(),
        }
    }
}

pub(crate) fn weread_snapshot_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_handle
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取微信读书缓存目录失败：{error}"))?
        .join(WEREAD_SNAPSHOT_FILE_NAME))
}

pub(crate) fn reading_workspace_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_handle
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取阅读工作区目录失败：{error}"))?
        .join(READING_WORKSPACE_FILE_NAME))
}

pub(crate) fn build_gateway_payload(api_name: &str, params: Value) -> Value {
    let mut payload = Map::new();
    payload.insert("api_name".to_string(), Value::String(api_name.to_string()));
    payload.insert(
        "skill_version".to_string(),
        Value::String(WEREAD_SKILL_VERSION.to_string()),
    );

    if let Value::Object(params) = params {
        for (key, value) in params {
            payload.insert(key, value);
        }
    }

    Value::Object(payload)
}

pub(crate) fn normalize_notebook_count(
    review_count: i64,
    note_count: i64,
    bookmark_count: i64,
) -> i64 {
    review_count.max(0) + note_count.max(0) + bookmark_count.max(0)
}

pub(crate) fn normalize_book_progress(progress: i64) -> i64 {
    progress.clamp(0, 100)
}

pub(crate) fn load_weread_snapshot(path: &Path) -> Result<WereadSnapshot, String> {
    match fs::read_to_string(path) {
        Ok(content) if content.trim().is_empty() => Ok(WereadSnapshot::default()),
        Ok(content) => serde_json::from_str::<WereadSnapshot>(&content)
            .map(normalize_snapshot)
            .or_else(|_| Ok(WereadSnapshot::default())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(WereadSnapshot::default()),
        Err(error) => Err(format!("读取微信读书缓存失败：{error}")),
    }
}

pub(crate) fn save_weread_snapshot(
    path: &Path,
    snapshot: &WereadSnapshot,
) -> Result<WereadSnapshot, String> {
    let snapshot = normalize_snapshot(snapshot.clone());
    write_json(path, &snapshot, "微信读书缓存")?;

    Ok(snapshot)
}

pub(crate) fn mark_snapshot_sync_failed(
    mut snapshot: WereadSnapshot,
    error: impl Into<String>,
    updated_at: i64,
) -> WereadSnapshot {
    snapshot.schema_version = 1;
    snapshot.updated_at = updated_at.max(0);
    snapshot.status = "failed".to_string();
    snapshot.error_message = trim_text(&error.into(), 240);
    snapshot
}

pub(crate) async fn sync_snapshot(
    app_handle: &tauri::AppHandle,
    config: WereadCommandConfig,
) -> Result<WereadSnapshot, String> {
    let path = weread_snapshot_path(app_handle)?;
    let existing = load_weread_snapshot(&path)?;
    let api_key = config.wechat_api_key.trim().to_string();
    let now = current_timestamp_ms();

    if api_key.is_empty() {
        let snapshot =
            mark_snapshot_sync_failed(existing, "请先在设置中配置微信读书 API Key。", now);

        return save_weread_snapshot(&path, &snapshot);
    }

    let result = request_snapshot_values(&api_key).await;
    let snapshot = match result {
        Ok(values) => snapshot_from_values(values, now),
        Err(error) => mark_snapshot_sync_failed(existing, error, now),
    };

    save_weread_snapshot(&path, &snapshot)
}

pub(crate) async fn get_book_notes(
    book_id: String,
    config: WereadCommandConfig,
) -> Result<WereadBookNotes, String> {
    let api_key = config.wechat_api_key.trim().to_string();
    let book_id = book_id.trim().to_string();

    if api_key.is_empty() {
        return Err("请先在设置中配置微信读书 API Key。".to_string());
    }

    if book_id.is_empty() {
        return Err("缺少 bookId。".to_string());
    }

    let bookmarks =
        request_gateway(&api_key, "/book/bookmarklist", json!({ "bookId": book_id })).await?;
    let reviews = request_gateway(
        &api_key,
        "/review/list/mine",
        json!({ "bookid": book_id, "count": 20 }),
    )
    .await?;

    Ok(book_notes_from_values(&bookmarks, &reviews))
}

pub(crate) fn load_reading_workspace(path: &Path) -> Result<Value, String> {
    match fs::read_to_string(path) {
        Ok(content) if content.trim().is_empty() => Ok(json!({})),
        Ok(content) => serde_json::from_str::<Value>(&content).or_else(|_| Ok(json!({}))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
        Err(error) => Err(format!("读取阅读工作区失败：{error}")),
    }
}

pub(crate) fn save_reading_workspace(path: &Path, workspace: &Value) -> Result<Value, String> {
    write_json(path, workspace, "阅读工作区")?;

    Ok(workspace.clone())
}

async fn request_snapshot_values(api_key: &str) -> Result<SnapshotValues, String> {
    let shelf = request_gateway(api_key, "/shelf/sync", json!({})).await?;
    let reading_stats =
        request_gateway(api_key, "/readdata/detail", json!({ "mode": "monthly" })).await?;
    let notebooks = request_gateway(api_key, "/user/notebooks", json!({ "count": 20 })).await?;
    let recommendations =
        request_gateway(api_key, "/book/recommend", json!({ "count": 8 })).await?;

    Ok(SnapshotValues {
        shelf,
        reading_stats,
        notebooks,
        recommendations,
    })
}

async fn request_gateway(api_key: &str, api_name: &str, params: Value) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(WEREAD_GATEWAY_URL)
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .json(&build_gateway_payload(api_name, params))
        .send()
        .await
        .map_err(|error| format!("请求微信读书失败：{error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("读取微信读书响应失败：{error}"))?;

    if !status.is_success() {
        return Err(format!("微信读书返回 {status}：{}", truncate_error(&body)));
    }

    let value = serde_json::from_str::<Value>(&body)
        .map_err(|error| format!("解析微信读书响应失败：{error}"))?;

    if let Some(upgrade_info) = value.get("upgrade_info") {
        let message = text_value(upgrade_info.get("message"))
            .unwrap_or_else(|| "微信读书能力需要升级".to_string());
        return Err(message);
    }

    if value.get("errcode").and_then(Value::as_i64).unwrap_or(0) != 0 {
        let message =
            text_value(value.get("errmsg")).unwrap_or_else(|| "微信读书接口返回错误".to_string());
        return Err(message);
    }

    Ok(value)
}

struct SnapshotValues {
    shelf: Value,
    reading_stats: Value,
    notebooks: Value,
    recommendations: Value,
}

fn snapshot_from_values(values: SnapshotValues, updated_at: i64) -> WereadSnapshot {
    normalize_snapshot(WereadSnapshot {
        schema_version: 1,
        updated_at,
        status: "success".to_string(),
        error_message: String::new(),
        shelf: shelf_summary_from_value(&values.shelf),
        reading_stats: reading_stats_from_value(&values.reading_stats),
        notebooks: notebooks_from_value(&values.notebooks),
        recommended_books: recommendations_from_value(&values.recommendations),
    })
}

fn shelf_summary_from_value(value: &Value) -> WereadShelfSummary {
    let books = value
        .get("books")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let albums = value
        .get("albums")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let has_mp = value
        .get("mp")
        .and_then(Value::as_object)
        .is_some_and(|mp| !mp.is_empty());
    let mut items = Vec::new();

    for book in &books {
        if let Some(item) = shelf_book_from_value(book) {
            items.push(item);
        }
    }

    for album in &albums {
        if let Some(item) = shelf_album_from_value(album) {
            items.push(item);
        }
    }

    if has_mp {
        items.push(WereadShelfItem {
            id: "mp".to_string(),
            kind: "mp".to_string(),
            title: "文章收藏".to_string(),
            author: String::new(),
            category: "文章收藏".to_string(),
            cover: String::new(),
            updated_at: 0,
            updated_at_label: String::new(),
            is_finished: false,
            is_private: true,
            deep_link: String::new(),
        });
    }

    let mut recent_items = items
        .iter()
        .filter(|item| item.updated_at > 0)
        .cloned()
        .collect::<Vec<_>>();
    recent_items.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    recent_items.truncate(8);

    WereadShelfSummary {
        total_count: books.len() + albums.len() + usize::from(has_mp),
        book_count: books.len(),
        album_count: albums.len(),
        mp_count: usize::from(has_mp),
        public_count: items.iter().filter(|item| !item.is_private).count(),
        private_count: items.iter().filter(|item| item.is_private).count(),
        finished_book_count: items
            .iter()
            .filter(|item| item.kind == "book" && item.is_finished)
            .count(),
        reading_book_count: items
            .iter()
            .filter(|item| item.kind == "book" && !item.is_finished && item.updated_at > 0)
            .count(),
        recent_items,
    }
}

fn shelf_book_from_value(value: &Value) -> Option<WereadShelfItem> {
    let book_id = text_value(value.get("bookId"))?;
    let updated_at = int_value(value.get("readUpdateTime"))
        .or_else(|| int_value(value.get("updateTime")))
        .unwrap_or(0);
    let title = text_value(value.get("title"))?;

    Some(WereadShelfItem {
        id: book_id.clone(),
        kind: "book".to_string(),
        title,
        author: text_value(value.get("author")).unwrap_or_default(),
        category: text_value(value.get("category")).unwrap_or_default(),
        cover: text_value(value.get("cover")).unwrap_or_default(),
        updated_at,
        updated_at_label: format_date(updated_at),
        is_finished: int_value(value.get("finishReading")).unwrap_or(0) == 1,
        is_private: int_value(value.get("secret")).unwrap_or(0) == 1,
        deep_link: format!("weread://reading?bId={book_id}"),
    })
}

fn shelf_album_from_value(value: &Value) -> Option<WereadShelfItem> {
    let info = value.get("albumInfo")?;
    let extra = value.get("albumInfoExtra").unwrap_or(&Value::Null);
    let album_id = text_value(info.get("albumId"))?;
    let updated_at = int_value(extra.get("lectureReadUpdateTime"))
        .or_else(|| int_value(info.get("updateTime")))
        .unwrap_or(0);
    let title = text_value(info.get("name"))?;

    Some(WereadShelfItem {
        id: album_id,
        kind: "album".to_string(),
        title,
        author: text_value(info.get("authorName")).unwrap_or_default(),
        category: "有声书".to_string(),
        cover: text_value(info.get("cover")).unwrap_or_default(),
        updated_at,
        updated_at_label: format_date(updated_at),
        is_finished: int_value(info.get("finish")).unwrap_or(0) == 1,
        is_private: int_value(extra.get("secret")).unwrap_or(0) == 1,
        deep_link: String::new(),
    })
}

fn reading_stats_from_value(value: &Value) -> WereadReadingStats {
    let total_read_time_seconds = int_value(value.get("totalReadTime")).unwrap_or(0);
    let day_average_read_time_seconds = int_value(value.get("dayAverageReadTime")).unwrap_or(0);
    let prefer_categories = value
        .get("preferCategory")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(prefer_category_from_value)
                .take(8)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let longest_books = value
        .get("readLongest")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(longest_book_from_value)
                .take(5)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    WereadReadingStats {
        mode: "monthly".to_string(),
        read_days: int_value(value.get("readDays")).unwrap_or(0),
        total_read_time_seconds,
        total_read_time_label: format_duration(total_read_time_seconds),
        day_average_read_time_seconds,
        day_average_read_time_label: format_duration(day_average_read_time_seconds),
        prefer_categories,
        longest_books,
    }
}

fn prefer_category_from_value(value: &Value) -> Option<WereadPreferCategory> {
    let title = text_value(value.get("categoryTitle"))?;
    let reading_time_seconds = int_value(value.get("readingTime")).unwrap_or(0);

    Some(WereadPreferCategory {
        title,
        reading_time_seconds,
        reading_time_label: format_duration(reading_time_seconds),
        reading_count: int_value(value.get("readingCount")).unwrap_or(0),
    })
}

fn longest_book_from_value(value: &Value) -> Option<WereadLongestBook> {
    let source = value
        .get("book")
        .filter(|book| book.is_object())
        .or_else(|| value.get("albumInfo").filter(|album| album.is_object()))?;
    let id = text_value(source.get("bookId")).or_else(|| text_value(source.get("albumId")))?;
    let title = text_value(source.get("title")).or_else(|| text_value(source.get("name")))?;
    let read_time_seconds = int_value(value.get("readTime")).unwrap_or(0);

    Some(WereadLongestBook {
        id,
        title,
        author: text_value(source.get("author"))
            .or_else(|| text_value(source.get("authorName")))
            .unwrap_or_default(),
        cover: text_value(source.get("cover")).unwrap_or_default(),
        read_time_seconds,
        read_time_label: format_duration(read_time_seconds),
    })
}

fn notebooks_from_value(value: &Value) -> WereadNotebooksSummary {
    let mut books = value
        .get("books")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(notebook_book_from_value)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    books.sort_by(|left, right| right.total_note_count.cmp(&left.total_note_count));
    books.truncate(12);
    let total_note_count = int_value(value.get("totalNoteCount"))
        .unwrap_or_else(|| books.iter().map(|book| book.total_note_count).sum());

    WereadNotebooksSummary {
        total_book_count: int_value(value.get("totalBookCount")).unwrap_or(books.len() as i64),
        total_note_count,
        books,
    }
}

fn notebook_book_from_value(value: &Value) -> Option<WereadNotebookBook> {
    let book = value.get("book").unwrap_or(value);
    let book_id = text_value(value.get("bookId")).or_else(|| text_value(book.get("bookId")))?;
    let title = text_value(book.get("title"))?;
    let review_count = int_value(value.get("reviewCount")).unwrap_or(0);
    let note_count = int_value(value.get("noteCount")).unwrap_or(0);
    let bookmark_count = int_value(value.get("bookmarkCount")).unwrap_or(0);
    let sort = int_value(value.get("sort")).unwrap_or(0);

    Some(WereadNotebookBook {
        book_id,
        title,
        author: text_value(book.get("author")).unwrap_or_default(),
        cover: text_value(book.get("cover")).unwrap_or_default(),
        review_count,
        note_count,
        bookmark_count,
        total_note_count: normalize_notebook_count(review_count, note_count, bookmark_count),
        reading_progress: normalize_book_progress(
            int_value(value.get("readingProgress")).unwrap_or(0),
        ),
        marked_status: int_value(value.get("markedStatus")).unwrap_or(0),
        sort,
        sort_label: format_date(sort),
    })
}

fn recommendations_from_value(value: &Value) -> Vec<WereadRecommendedBook> {
    value
        .get("books")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(recommended_book_from_value)
                .take(12)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn recommended_book_from_value(value: &Value) -> Option<WereadRecommendedBook> {
    let source = value.get("bookInfo").unwrap_or(value);
    let book_id = text_value(source.get("bookId"))?;
    let title = text_value(source.get("title"))?;

    Some(WereadRecommendedBook {
        book_id: book_id.clone(),
        title,
        author: text_value(source.get("author")).unwrap_or_default(),
        cover: text_value(source.get("cover")).unwrap_or_default(),
        category: text_value(source.get("category")).unwrap_or_default(),
        intro: text_value(source.get("intro")).unwrap_or_default(),
        reason: text_value(value.get("reason")).unwrap_or_default(),
        rating: int_value(value.get("newRating"))
            .or_else(|| int_value(source.get("newRating")))
            .unwrap_or(0),
        deep_link: format!("weread://reading?bId={book_id}"),
    })
}

fn book_notes_from_values(bookmarks: &Value, reviews: &Value) -> WereadBookNotes {
    let book = bookmarks.get("book").unwrap_or(&Value::Null);
    let chapters = chapter_titles(bookmarks.get("chapters"));
    let book_id = text_value(book.get("bookId")).unwrap_or_default();

    WereadBookNotes {
        book_id,
        title: text_value(book.get("title")).unwrap_or_default(),
        author: text_value(book.get("author")).unwrap_or_default(),
        highlights: bookmarks
            .get("updated")
            .and_then(Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| highlight_from_value(item, &chapters))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
        reviews: reviews
            .get("reviews")
            .and_then(Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(review_from_value)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
    }
}

fn chapter_titles(value: Option<&Value>) -> HashMap<i64, String> {
    let mut chapters = HashMap::new();

    if let Some(items) = value.and_then(Value::as_array) {
        for chapter in items {
            if let (Some(uid), Some(title)) = (
                int_value(chapter.get("chapterUid")),
                text_value(chapter.get("title")),
            ) {
                chapters.insert(uid, title);
            }
        }
    }

    chapters
}

fn highlight_from_value(value: &Value, chapters: &HashMap<i64, String>) -> Option<WereadHighlight> {
    let text = text_value(value.get("markText"))?;
    let book_id = text_value(value.get("bookId")).unwrap_or_default();
    let chapter_uid = int_value(value.get("chapterUid")).unwrap_or(0);
    let created_at = int_value(value.get("createTime")).unwrap_or(0);
    let range = text_value(value.get("range")).unwrap_or_default();

    Some(WereadHighlight {
        id: text_value(value.get("bookmarkId")).unwrap_or_else(|| make_id("highlight", &text)),
        book_id: book_id.clone(),
        chapter_uid,
        chapter_title: chapters.get(&chapter_uid).cloned().unwrap_or_default(),
        text,
        created_at,
        created_at_label: format_date(created_at),
        deep_link: bookmark_deep_link(&book_id, chapter_uid, &range),
    })
}

fn review_from_value(value: &Value) -> Option<WereadReviewNote> {
    let review = value.get("review").unwrap_or(value);
    let content = text_value(review.get("content"))?;
    let book_id = text_value(review.get("bookId")).unwrap_or_default();
    let chapter_uid = int_value(review.get("chapterUid")).unwrap_or(0);
    let range = text_value(review.get("range")).unwrap_or_default();
    let created_at = int_value(review.get("createTime")).unwrap_or(0);

    Some(WereadReviewNote {
        id: text_value(review.get("reviewId")).unwrap_or_else(|| make_id("review", &content)),
        content,
        chapter_name: text_value(review.get("chapterName")).unwrap_or_default(),
        created_at,
        created_at_label: format_date(created_at),
        deep_link: bookmark_deep_link(&book_id, chapter_uid, &range),
    })
}

fn bookmark_deep_link(book_id: &str, chapter_uid: i64, range: &str) -> String {
    let Some((start, end)) = range.split_once('-') else {
        return String::new();
    };

    if book_id.is_empty() || chapter_uid <= 0 || start.is_empty() || end.is_empty() {
        return String::new();
    }

    format!(
        "weread://bestbookmark?bookId={book_id}&chapterUid={chapter_uid}&rangeStart={start}&rangeEnd={end}"
    )
}

fn normalize_snapshot(mut snapshot: WereadSnapshot) -> WereadSnapshot {
    snapshot.schema_version = 1;

    if !matches!(snapshot.status.as_str(), "empty" | "success" | "failed") {
        snapshot.status = "empty".to_string();
    }

    snapshot.error_message = trim_text(&snapshot.error_message, 240);
    snapshot
}

fn write_json<T: Serialize>(path: &Path, value: &T, label: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建{label}目录失败：{error}"))?;
    }

    let content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("序列化{label}失败：{error}"))?;

    fs::write(path, content).map_err(|error| format!("写入{label}失败：{error}"))
}

fn text_value(value: Option<&Value>) -> Option<String> {
    value
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn int_value(value: Option<&Value>) -> Option<i64> {
    match value {
        Some(Value::Number(number)) => number.as_i64(),
        Some(Value::String(text)) => text.trim().parse::<i64>().ok(),
        _ => None,
    }
}

fn trim_text(value: &str, max_chars: usize) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(max_chars)
        .collect()
}

fn format_duration(seconds: i64) -> String {
    let total_minutes = (seconds.max(0)) / 60;
    let hours = total_minutes / 60;
    let minutes = total_minutes % 60;

    match (hours, minutes) {
        (0, minutes) => format!("{minutes}分钟"),
        (hours, 0) => format!("{hours}小时"),
        (hours, minutes) => format!("{hours}小时{minutes}分钟"),
    }
}

fn format_date(timestamp_seconds: i64) -> String {
    if timestamp_seconds <= 0 {
        return String::new();
    }

    chrono_like_date(timestamp_seconds)
}

fn chrono_like_date(timestamp_seconds: i64) -> String {
    let days = timestamp_seconds.div_euclid(86_400);
    let (year, month, day) = civil_from_days(days);

    format!("{year:04}-{month:02}-{day:02}")
}

// Howard Hinnant's civil date conversion for Unix days.
fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if month <= 2 { 1 } else { 0 };

    (year, month, day)
}

fn make_id(prefix: &str, source: &str) -> String {
    let mut hash = 0xcbf29ce484222325_u64;

    for byte in source.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    format!("{prefix}-{hash:x}")
}

fn truncate_error(body: &str) -> String {
    const MAX_LEN: usize = 600;

    if body.chars().count() <= MAX_LEN {
        body.to_string()
    } else {
        format!("{}...", body.chars().take(MAX_LEN).collect::<String>())
    }
}

fn current_timestamp_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}
