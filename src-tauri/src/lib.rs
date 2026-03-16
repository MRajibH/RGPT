use reqwest::Client;
use serde_json::json;

#[tauri::command]
async fn ask_ollama(prompt: String) -> Result<String, String> {
    let client = Client::new();
    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&json!({
            "model": "qwen3:0.6b",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    if let Some(response) = json.get("response").and_then(|r| r.as_str()) {
        Ok(response.to_string())
    } else {
        Err("Failed to parse response".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![ask_ollama])
    .setup(|_app| {
      if cfg!(debug_assertions) {
        // Only load the log plugin if it is in Cargo.toml. 
        // For now let's skip the log plugin so we don't encounter errors if it's missing.
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
