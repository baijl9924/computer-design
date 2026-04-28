package org.example.geometric;
import org.example.geometric.model.GeoRequest;
import org.example.geometric.model.GeoResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GeometryController {

    @PostMapping("/generate")
    public GeoResponse generate(@RequestBody GeoRequest request) {
        GeoResponse response = new GeoResponse();
        response.setSuccess(true);
        response.setType(request.getType());
        response.setParams(request.getParams());
        response.setMessage("生成成功");
        return response;
    }
}
