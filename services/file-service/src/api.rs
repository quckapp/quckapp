use actix_web::{web, HttpResponse};
use bson::{doc, oid::ObjectId};
use chrono::Utc;
use futures::stream::TryStreamExt;
use mongodb::options::FindOptions;

use crate::models::*;
use crate::AppState;

pub async fn upload_file(
    state: web::Data<AppState>,
    query: web::Query<UploadRequest>,
) -> HttpResponse {
    let collection = state.db.collection::<File>("files");

    // In production, handle multipart upload and S3 storage
    let file = File {
        id: None,
        name: format!("file_{}", uuid::Uuid::new_v4()),
        original_name: "uploaded_file".to_string(),
        mime_type: "application/octet-stream".to_string(),
        size: 0,
        storage_key: format!("files/{}/{}", query.workspace_id, uuid::Uuid::new_v4()),
        url: "".to_string(),
        thumbnail_url: None,
        workspace_id: query.workspace_id.clone(),
        channel_id: query.channel_id.clone(),
        uploaded_by: query.uploaded_by.clone(),
        checksum: "".to_string(),
        metadata: FileMetadata::default(),
        is_public: false,
        deleted_at: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    match collection.insert_one(file.clone(), None).await {
        Ok(result) => {
            let mut f = file;
            f.id = result.inserted_id.as_object_id();
            HttpResponse::Created().json(f)
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

pub async fn get_file(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    let collection = state.db.collection::<File>("files");
    let id = path.into_inner();

    let object_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(serde_json::json!({"error": "Invalid ID"})),
    };

    match collection.find_one(doc! { "_id": object_id, "deleted_at": null }, None).await {
        Ok(Some(file)) => HttpResponse::Ok().json(FileResponse {
            download_url: format!("/api/v1/files/{}/download", id),
            file,
        }),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({"error": "File not found"})),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

pub async fn list_files(
    state: web::Data<AppState>,
    query: web::Query<FileQueryParams>,
) -> HttpResponse {
    let collection = state.db.collection::<File>("files");
    let limit = query.limit.unwrap_or(50).min(100);

    let mut filter = doc! { "deleted_at": null };
    if let Some(workspace_id) = &query.workspace_id {
        filter.insert("workspace_id", workspace_id);
    }
    if let Some(channel_id) = &query.channel_id {
        filter.insert("channel_id", channel_id);
    }

    let options = FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .limit(limit)
        .build();

    match collection.find(filter.clone(), options).await {
        Ok(cursor) => {
            let files: Vec<File> = cursor.try_collect().await.unwrap_or_default();
            let total = collection.count_documents(filter, None).await.unwrap_or(0);
            HttpResponse::Ok().json(FilesResponse { files, total })
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

pub async fn delete_file(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    let collection = state.db.collection::<File>("files");
    let id = path.into_inner();

    let object_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(serde_json::json!({"error": "Invalid ID"})),
    };

    match collection.update_one(
        doc! { "_id": object_id },
        doc! { "$set": { "deleted_at": Utc::now() } },
        None
    ).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

pub async fn download_file(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    let collection = state.db.collection::<File>("files");
    let id = path.into_inner();

    let object_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(serde_json::json!({"error": "Invalid ID"})),
    };

    match collection.find_one(doc! { "_id": object_id }, None).await {
        Ok(Some(file)) => {
            // Generate presigned URL from S3
            let presigned_url = format!("https://{}.s3.amazonaws.com/{}", state.s3_bucket, file.storage_key);
            HttpResponse::TemporaryRedirect()
                .append_header(("Location", presigned_url))
                .finish()
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({"error": "File not found"})),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

pub async fn share_file(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> HttpResponse {
    let collection = state.db.collection::<File>("files");
    let id = path.into_inner();

    let object_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(serde_json::json!({"error": "Invalid ID"})),
    };

    match collection.update_one(
        doc! { "_id": object_id },
        doc! { "$set": { "is_public": true } },
        None
    ).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "share_url": format!("/api/v1/files/{}/download", id)
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}
