package org.example.geometric.model;

import lombok.Data;

@Data
public class FunctionKnowledgeResponse {
    private boolean success;
    private String html;
    private String source;
    private String error;
}
