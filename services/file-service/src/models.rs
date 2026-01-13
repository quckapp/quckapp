use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct File {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub original_name: String,
    pub mime_type: String,
    pub size: u64,
    pub storage_key: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_url: Option<String>,
    pub workspace_id: String,
    pub channel_id: Option<String>,
    pub uploaded_by: String,
    pub checksum: String,
    #[serde(default)]
    pub metadata: FileMetadata,
    pub is_public: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct FileMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pages: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct UploadRequest {
    pub workspace_id: String,
    pub channel_id: Option<String>,
    pub uploaded_by: String,
}

#[derive(Debug, Deserialize)]
pub struct FileQueryParams {
    pub workspace_id: Option<String>,
    pub channel_id: Option<String>,
    pub uploaded_by: Option<String>,
    pub mime_type: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct FileResponse {
    pub file: File,
    pub download_url: String,
}

#[derive(Debug, Serialize)]
pub struct FilesResponse {
    pub files: Vec<File>,
    pub total: u64,
}
