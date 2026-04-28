package org.example.geometric.model;
import lombok.Data;
import java.util.Map;

@Data
public class GeoResponse {
    private boolean success;
    private String type;
    private Map<String, Double> params;
    private String message;
}
