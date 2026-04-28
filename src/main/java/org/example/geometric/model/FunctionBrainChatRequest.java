package org.example.geometric.model;

import lombok.Data;

import java.util.List;

@Data
public class FunctionBrainChatRequest {
    private String expression;
    private String question;
    private String family;
    private String title;
    private List<String> tags;
    private List<String> tips;
    private List<KnowledgeCard> cards;
    private Boolean preferAdvancedModel;

    @Data
    public static class KnowledgeCard {
        private String title;
        private List<String> items;
    }
}
