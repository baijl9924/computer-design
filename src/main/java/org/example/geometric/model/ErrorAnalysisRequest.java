package org.example.geometric.model;

import lombok.Data;

@Data
public class ErrorAnalysisRequest {
    private String expression;
    private String standardImage;  // base64 encoded
    private String userImage;      // base64 encoded
    private Boolean preferAdvancedModel;
}
