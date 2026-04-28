package org.example.geometric.model;

import lombok.Data;

@Data
public class ErrorAnalysisResponse {
    private boolean success;
    private String analysis;  // HTML string
}
