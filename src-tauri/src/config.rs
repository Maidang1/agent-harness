use serde::Deserialize;

pub(crate) const DEFAULT_OPENROUTER_MODEL: &str = "deepseek/deepseek-v4-flash";
pub(crate) const DEFAULT_OPENROUTER_BASE_URL: &str =
    "https://openrouter.ai/api/v1/chat/completions";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ClientConfig {
    pub(crate) openrouter: ClientOpenRouterConfig,
    pub(crate) wechat_api_key: Option<String>,
    pub(crate) preferences: Option<UserPreferences>,
    pub(crate) memory: Option<MemorySettings>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ClientOpenRouterConfig {
    pub(crate) api_key: String,
    pub(crate) model: Option<String>,
    pub(crate) base_url: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UserPreferences {
    pub(crate) favorite_categories: Vec<String>,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MemorySettings {
    pub(crate) enabled: bool,
    pub(crate) include_in_recommendations: bool,
    pub(crate) auto_generate_from_prompt: bool,
}

impl Default for MemorySettings {
    fn default() -> Self {
        Self {
            enabled: true,
            include_in_recommendations: true,
            auto_generate_from_prompt: true,
        }
    }
}

#[derive(Debug)]
pub(crate) struct RuntimeConfig {
    pub(crate) openrouter: OpenRouterConfig,
    pub(crate) wechat_api_key: Option<String>,
    pub(crate) preferences: UserPreferences,
    pub(crate) memory: MemorySettings,
}

#[derive(Debug)]
pub(crate) struct OpenRouterConfig {
    pub(crate) api_key: String,
    pub(crate) model: String,
    pub(crate) base_url: String,
}

pub(crate) fn build_client_config(config: ClientConfig) -> Result<RuntimeConfig, String> {
    Ok(RuntimeConfig {
        openrouter: build_openrouter_config(config.openrouter)?,
        wechat_api_key: optional_secret_value(config.wechat_api_key),
        preferences: normalize_preferences(config.preferences),
        memory: config.memory.unwrap_or_default(),
    })
}

fn build_openrouter_config(config: ClientOpenRouterConfig) -> Result<OpenRouterConfig, String> {
    let api_key = config.api_key.trim().to_string();

    if api_key.is_empty() {
        return Err("请在客户端配置 OpenRouter API Key。".to_string());
    }

    Ok(OpenRouterConfig {
        api_key,
        model: optional_config_value(config.model, DEFAULT_OPENROUTER_MODEL),
        base_url: optional_config_value(config.base_url, DEFAULT_OPENROUTER_BASE_URL),
    })
}

fn normalize_preferences(preferences: Option<UserPreferences>) -> UserPreferences {
    let mut favorite_categories = Vec::new();

    for category in preferences.unwrap_or_default().favorite_categories {
        let category = category.trim().to_string();

        if category.is_empty() || favorite_categories.contains(&category) {
            continue;
        }

        favorite_categories.push(category);
    }

    UserPreferences {
        favorite_categories,
    }
}

fn optional_config_value(value: Option<String>, default_value: &str) -> String {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(default_value)
        .to_string()
}

fn optional_secret_value(value: Option<String>) -> Option<String> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn openrouter_config_requires_client_api_key() {
        let error = build_openrouter_config(ClientOpenRouterConfig {
            api_key: "   ".to_string(),
            model: None,
            base_url: None,
        })
        .unwrap_err();

        assert_eq!(error, "请在客户端配置 OpenRouter API Key。");
    }

    #[test]
    fn openrouter_config_trims_client_values() {
        let config = build_openrouter_config(ClientOpenRouterConfig {
            api_key: "  sk-test  ".to_string(),
            model: Some("  deepseek/test  ".to_string()),
            base_url: Some("  https://example.com/api/chat  ".to_string()),
        })
        .unwrap();

        assert_eq!(config.api_key, "sk-test");
        assert_eq!(config.model, "deepseek/test");
        assert_eq!(config.base_url, "https://example.com/api/chat");
    }

    #[test]
    fn openrouter_config_fills_optional_defaults() {
        let config = build_openrouter_config(ClientOpenRouterConfig {
            api_key: "sk-test".to_string(),
            model: Some(" ".to_string()),
            base_url: None,
        })
        .unwrap();

        assert_eq!(config.model, DEFAULT_OPENROUTER_MODEL);
        assert_eq!(config.base_url, DEFAULT_OPENROUTER_BASE_URL);
    }

    #[test]
    fn client_config_trims_wechat_api_key() {
        let config = build_client_config(ClientConfig {
            openrouter: ClientOpenRouterConfig {
                api_key: "sk-test".to_string(),
                model: None,
                base_url: None,
            },
            wechat_api_key: Some("  wx-test  ".to_string()),
            preferences: None,
            memory: None,
        })
        .unwrap();

        assert_eq!(config.wechat_api_key.as_deref(), Some("wx-test"));
    }

    #[test]
    fn client_config_defaults_memory_settings() {
        let config = build_client_config(ClientConfig {
            openrouter: ClientOpenRouterConfig {
                api_key: "sk-test".to_string(),
                model: None,
                base_url: None,
            },
            wechat_api_key: None,
            preferences: None,
            memory: None,
        })
        .unwrap();

        assert_eq!(config.memory, MemorySettings::default());
    }

    #[test]
    fn client_config_keeps_memory_settings() {
        let config = build_client_config(ClientConfig {
            openrouter: ClientOpenRouterConfig {
                api_key: "sk-test".to_string(),
                model: None,
                base_url: None,
            },
            wechat_api_key: None,
            preferences: None,
            memory: Some(MemorySettings {
                enabled: false,
                include_in_recommendations: false,
                auto_generate_from_prompt: true,
            }),
        })
        .unwrap();

        assert_eq!(
            config.memory,
            MemorySettings {
                enabled: false,
                include_in_recommendations: false,
                auto_generate_from_prompt: true,
            }
        );
    }
}
