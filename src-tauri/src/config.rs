use serde::Deserialize;

pub(crate) const DEFAULT_OPENROUTER_MODEL: &str = "deepseek/deepseek-v4-flash";
pub(crate) const DEFAULT_OPENROUTER_BASE_URL: &str =
    "https://openrouter.ai/api/v1/chat/completions";
pub(crate) const DEFAULT_CODEX_PATH: &str = "codex";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ClientConfig {
    #[serde(default = "default_provider")]
    pub(crate) provider: ClientProvider,
    pub(crate) openrouter: ClientOpenRouterConfig,
    #[serde(default)]
    pub(crate) codex: ClientCodexConfig,
    pub(crate) memory: Option<MemorySettings>,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ClientProvider {
    Openrouter,
    Codex,
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
pub(crate) struct ClientCodexConfig {
    pub(crate) model: Option<String>,
    pub(crate) codex_path: Option<String>,
    pub(crate) cwd: Option<String>,
    pub(crate) sandbox: Option<CodexSandboxMode>,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum CodexSandboxMode {
    ReadOnly,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MemorySettings {
    pub(crate) enabled: bool,
    pub(crate) auto_generate_from_prompt: bool,
}

impl Default for MemorySettings {
    fn default() -> Self {
        Self {
            enabled: true,
            auto_generate_from_prompt: true,
        }
    }
}

#[derive(Debug)]
pub(crate) struct RuntimeConfig {
    pub(crate) provider: ClientProvider,
    pub(crate) openrouter: Option<OpenRouterConfig>,
    pub(crate) codex: CodexConfig,
    pub(crate) memory: MemorySettings,
}

#[derive(Debug)]
pub(crate) struct OpenRouterConfig {
    pub(crate) api_key: String,
    pub(crate) model: String,
    pub(crate) base_url: String,
}

#[derive(Debug, Clone)]
pub(crate) struct CodexConfig {
    pub(crate) model: Option<String>,
    pub(crate) codex_path: String,
    pub(crate) cwd: String,
    pub(crate) sandbox: CodexSandboxMode,
}

pub(crate) fn build_client_config(config: ClientConfig) -> Result<RuntimeConfig, String> {
    let provider = config.provider;

    Ok(RuntimeConfig {
        provider,
        openrouter: match provider {
            ClientProvider::Openrouter => Some(build_openrouter_config(config.openrouter)?),
            ClientProvider::Codex => build_optional_openrouter_config(config.openrouter),
        },
        codex: build_codex_config(config.codex),
        memory: config.memory.unwrap_or_default(),
    })
}

fn default_provider() -> ClientProvider {
    ClientProvider::Openrouter
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

fn build_optional_openrouter_config(config: ClientOpenRouterConfig) -> Option<OpenRouterConfig> {
    let api_key = config.api_key.trim().to_string();

    if api_key.is_empty() {
        return None;
    }

    Some(OpenRouterConfig {
        api_key,
        model: optional_config_value(config.model, DEFAULT_OPENROUTER_MODEL),
        base_url: optional_config_value(config.base_url, DEFAULT_OPENROUTER_BASE_URL),
    })
}

fn build_codex_config(config: ClientCodexConfig) -> CodexConfig {
    CodexConfig {
        model: optional_string(config.model),
        codex_path: optional_config_value(config.codex_path, DEFAULT_CODEX_PATH),
        cwd: optional_string(config.cwd).unwrap_or_else(default_codex_cwd),
        sandbox: config.sandbox.unwrap_or(CodexSandboxMode::ReadOnly),
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

fn optional_string(value: Option<String>) -> Option<String> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn default_codex_cwd() -> String {
    std::env::current_dir()
        .ok()
        .and_then(|path| path.to_str().map(ToString::to_string))
        .unwrap_or_else(|| ".".to_string())
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
    fn client_config_defaults_memory_settings() {
        let config = build_client_config(ClientConfig {
            provider: ClientProvider::Openrouter,
            openrouter: ClientOpenRouterConfig {
                api_key: "sk-test".to_string(),
                model: None,
                base_url: None,
            },
            codex: ClientCodexConfig::default(),
            memory: None,
        })
        .unwrap();

        assert_eq!(config.provider, ClientProvider::Openrouter);
        assert_eq!(config.memory, MemorySettings::default());
        assert_eq!(config.openrouter.unwrap().model, DEFAULT_OPENROUTER_MODEL);
    }

    #[test]
    fn client_config_keeps_memory_settings() {
        let config = build_client_config(ClientConfig {
            provider: ClientProvider::Openrouter,
            openrouter: ClientOpenRouterConfig {
                api_key: "sk-test".to_string(),
                model: None,
                base_url: None,
            },
            codex: ClientCodexConfig::default(),
            memory: Some(MemorySettings {
                enabled: false,
                auto_generate_from_prompt: true,
            }),
        })
        .unwrap();

        assert_eq!(
            config.memory,
            MemorySettings {
                enabled: false,
                auto_generate_from_prompt: true,
            }
        );
    }

    #[test]
    fn codex_provider_does_not_require_openrouter_api_key() {
        let config = build_client_config(ClientConfig {
            provider: ClientProvider::Codex,
            openrouter: ClientOpenRouterConfig {
                api_key: "   ".to_string(),
                model: None,
                base_url: None,
            },
            codex: ClientCodexConfig {
                model: Some("  gpt-5.4  ".to_string()),
                codex_path: Some("  /opt/homebrew/bin/codex  ".to_string()),
                cwd: Some("  /tmp/book-agent  ".to_string()),
                sandbox: None,
            },
            memory: None,
        })
        .unwrap();

        assert_eq!(config.provider, ClientProvider::Codex);
        assert!(config.openrouter.is_none());
        assert_eq!(config.codex.model.as_deref(), Some("gpt-5.4"));
        assert_eq!(config.codex.codex_path, "/opt/homebrew/bin/codex");
        assert_eq!(config.codex.cwd, "/tmp/book-agent");
        assert_eq!(config.codex.sandbox, CodexSandboxMode::ReadOnly);
    }
}
