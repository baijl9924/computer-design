package org.example.geometric.model;
import lombok.Data;
import java.util.Map;
@Data
public class GeoRequest {
    private String type; // "ellipse2d" 或 "cube3d"
    private Map<String, Double> params; // 如 {a: 5, b: 3}
}
