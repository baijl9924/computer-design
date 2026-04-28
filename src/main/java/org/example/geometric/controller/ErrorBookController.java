package org.example.geometric.controller;

import org.example.geometric.model.ErrorAnalysisRequest;
import org.example.geometric.model.ErrorAnalysisResponse;
import org.example.geometric.model.FunctionBrainChatRequest;
import org.example.geometric.model.FunctionKnowledgeRequest;
import org.example.geometric.model.FunctionKnowledgeResponse;
import org.example.geometric.service.AIAnalysisService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ErrorBookController {

    private final AIAnalysisService aiAnalysisService;

    public ErrorBookController(AIAnalysisService aiAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
    }

    @PostMapping("/analyze-error")
    public ErrorAnalysisResponse analyzeError(@RequestBody ErrorAnalysisRequest request) {
        return aiAnalysisService.analyze(request);
    }

    @PostMapping("/function-knowledge")
    public FunctionKnowledgeResponse functionKnowledge(@RequestBody FunctionKnowledgeRequest request) {
        return aiAnalysisService.generateFunctionKnowledge(request.getExpression(), request.getPreferAdvancedModel());
    }

    @PostMapping(value = "/analyze-error-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter analyzeErrorStream(@RequestBody ErrorAnalysisRequest request) {
        SseEmitter emitter = new SseEmitter(180_000L);
        new Thread(() -> {
            try {
                aiAnalysisService.analyzeStream(request, emitter);
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send("[ERROR]" + e.getMessage());
                    emitter.complete();
                } catch (Exception ignored) {
                }
            }
        }).start();
        return emitter;
    }

    @PostMapping(value = "/function-brain-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter functionBrainStream(@RequestBody FunctionBrainChatRequest request) {
        SseEmitter emitter = new SseEmitter(180_000L);
        new Thread(() -> {
            try {
                aiAnalysisService.answerFunctionQuestionStream(request, emitter);
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send("[ERROR]" + e.getMessage());
                    emitter.complete();
                } catch (Exception ignored) {
                }
            }
        }).start();
        return emitter;
    }
}
