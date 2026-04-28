package org.example.geometric.service;

import org.example.geometric.model.ErrorAnalysisRequest;
import org.example.geometric.model.ErrorAnalysisResponse;
import org.example.geometric.model.FunctionBrainChatRequest;
import org.example.geometric.model.FunctionKnowledgeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AIAnalysisService {

    @Value("${ai.api.base-url}")
    private String apiBaseUrl;

    @Value("${ai.api.key}")
    private String apiKey;

    @Value("${ai.api.model}")
    private String apiModel;

    @Value("${ai.api.fallback.base-url:}")
    private String fallbackApiBaseUrl;

    @Value("${ai.api.fallback.key:}")
    private String fallbackKey;

    @Value("${ai.api.fallback.model:}")
    private String fallbackModel;

    @Value("${ai.api.advanced.base-url:}")
    private String advancedApiBaseUrl;

    @Value("${ai.api.advanced.key:}")
    private String advancedApiKey;

    @Value("${ai.api.advanced.model:}")
    private String advancedApiModel;

    @Value("${ai.api.advanced.models:}")
    private String advancedModels;

    private final RestClient restClient = RestClient.create();
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(12)).build();

    private static final long ADVANCED_CACHE_TTL_MS = 10 * 60 * 1000L;
    private volatile long advancedAvailabilityCheckedAt = 0L;
    private volatile EndpointCandidate cachedAdvancedCandidate;

    public ErrorAnalysisResponse analyze(ErrorAnalysisRequest request) {
        ErrorAnalysisResponse response = new ErrorAnalysisResponse();
        String validationError = validateRequest(request);
        if (validationError != null) {
            response.setSuccess(false);
            response.setAnalysis(validationError);
            return response;
        }

        String prompt = buildPrompt(request.getExpression());
        String standardB64 = stripDataUriPrefix(request.getStandardImage());
        String userB64 = stripDataUriPrefix(request.getUserImage());

        List<EndpointCandidate> targets = resolveCandidates(Boolean.TRUE.equals(request.getPreferAdvancedModel()));
        if (targets.isEmpty()) {
            response.setSuccess(false);
            response.setAnalysis("<p style='color:orange'>AI 模型尚未配置。</p><p>请检查后端模型配置。</p>");
            return response;
        }

        ErrorAnalysisResponse lastFailure = null;
        for (EndpointCandidate candidate : targets) {
            ErrorAnalysisResponse current = callVisionModel(candidate, prompt, standardB64, userB64);
            if (current.isSuccess()) {
                return current;
            }
            lastFailure = current;
        }

        if (lastFailure == null) {
            lastFailure = new ErrorAnalysisResponse();
            lastFailure.setSuccess(false);
            lastFailure.setAnalysis("AI 返回结果为空");
        }
        return lastFailure;
    }

    public void analyzeStream(ErrorAnalysisRequest request, SseEmitter emitter) {
        String validationError = validateRequest(request);
        if (validationError != null) {
            sendSafely(emitter, "[ERROR]" + validationError);
            return;
        }

        String prompt = buildPrompt(request.getExpression());
        String standardB64 = stripDataUriPrefix(request.getStandardImage());
        String userB64 = stripDataUriPrefix(request.getUserImage());
        List<EndpointCandidate> targets = resolveCandidates(Boolean.TRUE.equals(request.getPreferAdvancedModel()));

        if (targets.isEmpty()) {
            sendSafely(emitter, "[ERROR]AI 模型未配置，请检查高级模型或源码模型设置。");
            return;
        }

        Exception lastError = null;
        for (EndpointCandidate candidate : targets) {
            try {
                callVisionModelStream(candidate, prompt, standardB64, userB64, emitter);
                return;
            } catch (Exception error) {
                lastError = error;
            }
        }

        sendSafely(emitter, "[ERROR]" + escapeHtml(lastError == null ? "流式调用失败" : lastError.getMessage()));
    }

    public FunctionKnowledgeResponse generateFunctionKnowledge(String expression, Boolean preferAdvancedModel) {
        FunctionKnowledgeResponse response = new FunctionKnowledgeResponse();
        if (!StringUtils.hasText(expression)) {
            response.setSuccess(false);
            response.setError("函数表达式不能为空。");
            return response;
        }

        String prompt = buildFunctionKnowledgePrompt(expression);
        List<EndpointCandidate> targets = resolveCandidates(Boolean.TRUE.equals(preferAdvancedModel));
        if (targets.isEmpty()) {
            response.setSuccess(false);
            response.setError("AI 模型未配置，无法生成函数知识内容。");
            return response;
        }

        FunctionKnowledgeResponse lastFailure = null;
        for (EndpointCandidate candidate : targets) {
            FunctionKnowledgeResponse current = callTextModel(candidate, prompt);
            if (current.isSuccess()) {
                return current;
            }
            lastFailure = current;
        }

        if (lastFailure == null) {
            lastFailure = new FunctionKnowledgeResponse();
            lastFailure.setSuccess(false);
            lastFailure.setError("AI 没有返回知识卡内容。");
        }
        return lastFailure;
    }

    public void answerFunctionQuestionStream(FunctionBrainChatRequest request, SseEmitter emitter) {
        String validationError = validateFunctionBrainRequest(request);
        if (validationError != null) {
            sendSafely(emitter, "[ERROR]" + validationError);
            return;
        }

        String prompt = buildFunctionQuestionPrompt(request);
        List<EndpointCandidate> targets = resolveCandidates(Boolean.TRUE.equals(request.getPreferAdvancedModel()));
        if (targets.isEmpty()) {
            sendSafely(emitter, "[ERROR]AI 模型未配置，无法回答当前函数问题。");
            return;
        }

        Exception lastError = null;
        for (EndpointCandidate candidate : targets) {
            try {
                callTextModelStream(candidate, prompt, emitter);
                return;
            } catch (Exception error) {
                lastError = error;
            }
        }

        sendSafely(emitter, "[ERROR]" + escapeHtml(lastError == null ? "函数问答流式调用失败" : lastError.getMessage()));
    }

    private ErrorAnalysisResponse callVisionModel(EndpointCandidate candidate, String prompt, String standardB64, String userB64) {
        ErrorAnalysisResponse response = new ErrorAnalysisResponse();
        try {
            String fullPrompt = buildFullPrompt(prompt);
            Map<String, Object> body = Map.of(
                "model", candidate.model(),
                "messages", List.of(Map.of("role", "user", "content", List.of(
                    Map.of("type", "text", "text", fullPrompt),
                    Map.of("type", "image_url", "image_url", Map.of("url", "data:image/png;base64," + standardB64)),
                    Map.of("type", "image_url", "image_url", Map.of("url", "data:image/png;base64," + userB64))
                ))),
                "max_tokens", 2000
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> result = restClient.post()
                .uri(candidate.url())
                .header("Authorization", "Bearer " + candidate.apiKey())
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);

            String content = extractMessageContent(result);
            if (StringUtils.hasText(content)) {
                response.setSuccess(true);
                response.setAnalysis(cleanModelHtml(content));
                return response;
            }
            response.setSuccess(false);
            response.setAnalysis("AI 返回结果为空");
        } catch (Exception error) {
            response.setSuccess(false);
            response.setAnalysis(escapeHtml(error.getMessage()));
        }
        return response;
    }

    private void callVisionModelStream(EndpointCandidate candidate, String prompt,
                                       String standardB64, String userB64, SseEmitter emitter) throws Exception {
        String fullPrompt = buildFullPrompt(prompt);
        String jsonBody = buildJsonBody(candidate.model(), fullPrompt, standardB64, userB64);

        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(candidate.url()))
            .header("Authorization", "Bearer " + candidate.apiKey())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
            .build();

        HttpResponse<java.io.InputStream> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200) {
            String errorBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new RuntimeException(response.statusCode() + ": " + errorBody);
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) {
                    continue;
                }
                String data = line.substring(5).trim();
                if ("[DONE]".equals(data)) {
                    break;
                }
                String content = extractDeltaContent(data);
                String cleanedChunk = sanitizeStreamChunk(content);
                if (StringUtils.hasText(cleanedChunk)) {
                    emitter.send(cleanedChunk);
                }
            }
        }
    }

    private FunctionKnowledgeResponse callTextModel(EndpointCandidate candidate, String prompt) {
        FunctionKnowledgeResponse response = new FunctionKnowledgeResponse();
        try {
            Map<String, Object> body = Map.of(
                "model", candidate.model(),
                "messages", List.of(Map.of("role", "user", "content", buildKnowledgeSystemPrompt(prompt))),
                "max_tokens", 1800
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> result = restClient.post()
                .uri(candidate.url())
                .header("Authorization", "Bearer " + candidate.apiKey())
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);

            String content = extractMessageContent(result);
            if (StringUtils.hasText(content)) {
                response.setSuccess(true);
                response.setHtml(cleanModelHtml(content));
                response.setSource(candidate.name());
                return response;
            }
            response.setSuccess(false);
            response.setError("AI 返回结果为空");
        } catch (Exception error) {
            response.setSuccess(false);
            response.setError(escapeHtml(error.getMessage()));
        }
        return response;
    }

    private void callTextModelStream(EndpointCandidate candidate, String prompt, SseEmitter emitter) throws Exception {
        String jsonBody = buildTextStreamJsonBody(candidate.model(), buildKnowledgeSystemPrompt(prompt), 1800);

        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(candidate.url()))
            .header("Authorization", "Bearer " + candidate.apiKey())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
            .build();

        HttpResponse<java.io.InputStream> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200) {
            String errorBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new RuntimeException(response.statusCode() + ": " + errorBody);
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) {
                    continue;
                }
                String data = line.substring(5).trim();
                if ("[DONE]".equals(data)) {
                    break;
                }
                String content = extractDeltaContent(data);
                String cleanedChunk = sanitizeStreamChunk(content);
                if (StringUtils.hasText(cleanedChunk)) {
                    emitter.send(cleanedChunk);
                }
            }
        }
    }

    private List<EndpointCandidate> resolveCandidates(boolean preferAdvancedModel) {
        List<EndpointCandidate> candidates = new ArrayList<>();
        if (preferAdvancedModel) {
            EndpointCandidate advanced = resolveAdvancedCandidate();
            if (advanced != null) {
                candidates.add(advanced);
            }
        }

        EndpointCandidate primary = buildCandidate("primary", apiBaseUrl, apiModel, apiKey);
        if (primary != null) {
            candidates.add(primary);
        }

        EndpointCandidate fallback = buildCandidate(
            "fallback",
            StringUtils.hasText(fallbackApiBaseUrl) ? fallbackApiBaseUrl : apiBaseUrl,
            fallbackModel,
            fallbackKey
        );
        if (fallback != null && !candidates.contains(fallback)) {
            candidates.add(fallback);
        }
        return candidates;
    }

    private EndpointCandidate resolveAdvancedCandidate() {
        EndpointCandidate directlyConfigured = buildCandidate("advanced", advancedApiBaseUrl, advancedApiModel, advancedApiKey);
        if (directlyConfigured != null) {
            return directlyConfigured;
        }

        if (!StringUtils.hasText(advancedApiKey) || !StringUtils.hasText(advancedModels)) {
            return null;
        }

        long now = System.currentTimeMillis();
        if (cachedAdvancedCandidate != null && now - advancedAvailabilityCheckedAt < ADVANCED_CACHE_TTL_MS) {
            return cachedAdvancedCandidate;
        }
        if (cachedAdvancedCandidate == null && now - advancedAvailabilityCheckedAt < ADVANCED_CACHE_TTL_MS) {
            return null;
        }

        synchronized (this) {
            long insideNow = System.currentTimeMillis();
            if (cachedAdvancedCandidate != null && insideNow - advancedAvailabilityCheckedAt < ADVANCED_CACHE_TTL_MS) {
                return cachedAdvancedCandidate;
            }
            if (cachedAdvancedCandidate == null && insideNow - advancedAvailabilityCheckedAt < ADVANCED_CACHE_TTL_MS) {
                return null;
            }

            String normalizedUrl = normalizeApiUrl(advancedApiBaseUrl);
            EndpointCandidate resolved = null;
            for (String candidateModel : parseAdvancedModelCandidates()) {
                if (isEndpointAvailable(normalizedUrl, advancedApiKey, candidateModel)) {
                    resolved = new EndpointCandidate("advanced", normalizedUrl, candidateModel, advancedApiKey);
                    break;
                }
            }
            cachedAdvancedCandidate = resolved;
            advancedAvailabilityCheckedAt = System.currentTimeMillis();
            return resolved;
        }
    }

    private List<String> parseAdvancedModelCandidates() {
        return Arrays.stream(String.valueOf(advancedModels).split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .distinct()
            .toList();
    }

    private boolean isEndpointAvailable(String url, String apiKey, String model) {
        try {
            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", "请回复 ok")),
                "max_tokens", 8
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> result = restClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);
            return StringUtils.hasText(extractMessageContent(result));
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isConfigured(String model, String apiKey) {
        return StringUtils.hasText(model) && StringUtils.hasText(apiKey);
    }

    private EndpointCandidate buildCandidate(String name, String baseUrl, String model, String key) {
        if (!isConfigured(model, key) || !StringUtils.hasText(baseUrl)) {
            return null;
        }
        return new EndpointCandidate(name, normalizeApiUrl(baseUrl), model.trim(), key.trim());
    }

    private String extractMessageContent(Map<String, Object> result) {
        if (result == null || !result.containsKey("choices")) {
            return null;
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) result.get("choices");
        if (choices == null || choices.isEmpty()) {
            return null;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        if (message == null) {
            return null;
        }
        Object content = message.get("content");
        return content == null ? null : String.valueOf(content);
    }

    private String validateRequest(ErrorAnalysisRequest request) {
        if (request == null) {
            return "<p style='color:red'>请求体不能为空。</p>";
        }
        if (!StringUtils.hasText(request.getExpression())) {
            return "<p style='color:red'>目标函数表达式不能为空。</p>";
        }
        if (!StringUtils.hasText(request.getStandardImage()) || !StringUtils.hasText(request.getUserImage())) {
            return "<p style='color:red'>标准图像和手绘图像都不能为空。</p>";
        }
        return null;
    }

    private String validateFunctionBrainRequest(FunctionBrainChatRequest request) {
        if (request == null) {
            return "请求体不能为空。";
        }
        if (!StringUtils.hasText(request.getExpression())) {
            return "函数表达式不能为空。";
        }
        if (!StringUtils.hasText(request.getQuestion())) {
            return "提问内容不能为空。";
        }
        return null;
    }

    private String buildJsonBody(String model, String prompt, String standardB64, String userB64) {
        return "{\"model\":\"" + jsonEscape(model) + "\"," 
            + "\"stream\":true,"
            + "\"max_tokens\":2000,"
            + "\"messages\":[{\"role\":\"user\",\"content\":["
            + "{\"type\":\"text\",\"text\":\"" + jsonEscape(prompt) + "\"},"
            + "{\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/png;base64," + standardB64 + "\"}},"
            + "{\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/png;base64," + userB64 + "\"}}"
            + "]}]}";
    }

    private String buildTextStreamJsonBody(String model, String prompt, int maxTokens) {
        return "{\"model\":\"" + jsonEscape(model) + "\","
            + "\"stream\":true,"
            + "\"max_tokens\":" + maxTokens + ","
            + "\"messages\":[{\"role\":\"user\",\"content\":\"" + jsonEscape(prompt) + "\"}]}";
    }

    private String extractDeltaContent(String json) {
        String key = "\"content\":";
        int start = json.indexOf(key);
        if (start < 0) return null;
        start += key.length();
        StringBuilder buffer = new StringBuilder();
        boolean escaped = false;
        boolean quotedContent = json.charAt(start) == '"';
        if (quotedContent) {
            start += 1;
        }
        for (int index = start; index < json.length(); index++) {
            char current = json.charAt(index);
            if (escaped) {
                switch (current) {
                    case 'n' -> buffer.append('\n');
                    case 'r' -> buffer.append('\r');
                    case 't' -> buffer.append('\t');
                    case '"' -> buffer.append('"');
                    case '\\' -> buffer.append('\\');
                    default -> buffer.append('\\').append(current);
                }
                escaped = false;
            } else if (current == '\\') {
                escaped = true;
            } else if (quotedContent && current == '"') {
                break;
            } else {
                buffer.append(current);
            }
        }
        return buffer.toString();
    }

    private String jsonEscape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    private String cleanModelHtml(String value) {
        if (value == null) return "";
        return value
            .replaceAll("(?i)```html\\s*", "")
            .replace("```", "")
            .replaceAll("^\"\"\"|\"\"\"$", "")
            .replaceAll("^\"+|\"+$", "")
            .trim();
    }

    private String sanitizeStreamChunk(String chunk) {
        if (!StringUtils.hasText(chunk)) {
            return null;
        }
        String cleaned = chunk
            .replaceAll("(?i)```html", "")
            .replace("```", "")
            .replace("\"\"\"", "")
            .replace("<script", "&lt;script")
            .replace("</script>", "&lt;/script>");
        return cleaned.trim().isEmpty() ? null : cleaned;
    }

    private String buildFullPrompt(String prompt) {
        return "你是一个数学教学 AI 助手，专门帮助学生分析函数绘图错误。请直接用 HTML 标签回复（如 <p>、<ul>、<li>、<strong>），不要使用 markdown 代码块包裹。\n\n" + prompt;
    }

    private String buildPrompt(String expression) {
        return "请对比以下两张函数图像：\n"
            + "- 第一张是函数 " + expression + " 的标准正确图像\n"
            + "- 第二张是学生手绘的草图\n\n"
            + "请从以下几个方面分析学生的手绘图存在哪些错误：\n"
            + "1. 函数的整体形状（开口方向、对称性）\n"
            + "2. 关键点位置（顶点、交点、极值点）\n"
            + "3. 渐近线（如有）\n"
            + "4. 函数的增减趋势和凹凸性\n"
            + "5. 坐标轴标注\n\n"
            + "最后给出改进建议。请直接用 HTML 标签输出，不要包裹在 ```html 代码块中。";
    }

    private String buildKnowledgeSystemPrompt(String prompt) {
        return "你是一个富有创意的数学函数讲解助手。请直接输出 HTML，不要使用 markdown 代码块。"
            + "请尽量口语化、形象化，但数学结论要准确。"
            + prompt;
    }

    private String buildFunctionKnowledgePrompt(String expression) {
        return "\n\n请围绕函数 " + expression + " 生成一张适合前端展示的知识卡，要求："
            + "\n1. 用 <h4> 和 <p>/<ul>/<li> 组织内容；"
            + "\n2. 至少包含：图像直觉、定义/家族归类、关键性质、常用公式或判断方法、常见误区、一个例题方向；"
            + "\n3. 语言尽量生动，像老师面对学生讲解；"
            + "\n4. 不要输出 markdown 代码块，也不要省略 HTML 标签。";
    }

    private String buildFunctionQuestionPrompt(FunctionBrainChatRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("现在你要扮演高中数学函数辅导老师，结合给定的函数信息，回答学生的提问。")
            .append("\n请直接输出适合前端流式渲染的 HTML 片段，可以使用 <p>、<ul>、<li>、<strong>、<h4>，不要使用 Markdown 代码块。")
            .append("\n先直接回答学生问题，再补充 2 到 4 个关键判断点、常见误区或做题提醒。")
            .append("\n如果学生的问题偏向考点、易错点、解题方法，请优先按考试场景来讲。")
            .append("\n如果上下文没有完全覆盖，可以基于函数表达式做合理补充，但不要编造不存在的公式或结论。")
            .append("\n\n【函数表达式】\n").append(request.getExpression());

        if (StringUtils.hasText(request.getTitle())) {
            builder.append("\n\n【函数标题】\n").append(request.getTitle());
        }
        if (StringUtils.hasText(request.getFamily())) {
            builder.append("\n\n【函数家族】\n").append(request.getFamily());
        }
        if (request.getTags() != null && !request.getTags().isEmpty()) {
            builder.append("\n\n【标签】\n").append(String.join("、", request.getTags()));
        }
        if (request.getCards() != null && !request.getCards().isEmpty()) {
            builder.append("\n\n【基础知识卡】");
            for (FunctionBrainChatRequest.KnowledgeCard card : request.getCards()) {
                if (card == null || !StringUtils.hasText(card.getTitle())) {
                    continue;
                }
                builder.append("\n- ").append(card.getTitle()).append("：");
                if (card.getItems() != null && !card.getItems().isEmpty()) {
                    builder.append(String.join("；", card.getItems()));
                }
            }
        }
        if (request.getTips() != null && !request.getTips().isEmpty()) {
            builder.append("\n\n【学习建议】\n").append(String.join("；", request.getTips()));
        }

        builder.append("\n\n【学生提问】\n").append(request.getQuestion());
        builder.append("\n\n请给出结构清晰、口吻自然、对学生友好的回答。");
        return builder.toString();
    }

    private String stripDataUriPrefix(String data) {
        if (data != null && data.contains(",")) {
            return data.substring(data.indexOf(",") + 1);
        }
        return data;
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");
    }

    private String normalizeApiUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }
        String trimmed = url.trim();
        if (trimmed.endsWith("/v1/chat/completions") || trimmed.endsWith("/api/v1/chat/completions")) {
            return trimmed;
        }
        if (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed + "/v1/chat/completions";
    }

    private void sendSafely(SseEmitter emitter, String content) {
        try {
            emitter.send(content);
        } catch (Exception ignored) {
        }
    }

    private record EndpointCandidate(String name, String url, String model, String apiKey) {}
}
