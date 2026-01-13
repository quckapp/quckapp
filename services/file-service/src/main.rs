use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use mongodb::{Client, options::ClientOptions, Database};
use std::env;

mod api;
mod models;

pub struct AppState {
    pub db: Database,
    pub s3_bucket: String,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    let mongo_uri = env::var("MONGODB_URI").unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    let db_name = env::var("DATABASE_NAME").unwrap_or_else(|_| "quckchat_files".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3011".to_string());
    let s3_bucket = env::var("S3_BUCKET").unwrap_or_else(|_| "quckchat-files".to_string());

    let client_options = ClientOptions::parse(&mongo_uri).await.expect("Failed to parse MongoDB URI");
    let client = Client::with_options(client_options).expect("Failed to create MongoDB client");
    let db = client.database(&db_name);

    let state = web::Data::new(AppState { db, s3_bucket });

    tracing::info!("File service starting on port {}", port);

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(middleware::Logger::default())
            .route("/health", web::get().to(health_check))
            .service(
                web::scope("/api/v1/files")
                    .route("", web::post().to(api::upload_file))
                    .route("", web::get().to(api::list_files))
                    .route("/{id}", web::get().to(api::get_file))
                    .route("/{id}", web::delete().to(api::delete_file))
                    .route("/{id}/download", web::get().to(api::download_file))
                    .route("/{id}/share", web::post().to(api::share_file))
            )
    })
    .bind(format!("0.0.0.0:{}", port))?
    .run()
    .await
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status": "healthy", "service": "file-service"}))
}
