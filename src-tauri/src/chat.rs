use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ChatMessage {
    pub(crate) role: String,
    pub(crate) content: String,
}
