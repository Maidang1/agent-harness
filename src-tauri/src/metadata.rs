use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppMetadata {
    pub(crate) name: String,
    pub(crate) version: String,
}

pub(crate) fn app_metadata(app_handle: &tauri::AppHandle) -> AppMetadata {
    let package_info = app_handle.package_info();

    AppMetadata {
        name: package_info.name.clone(),
        version: package_info.version.to_string(),
    }
}
