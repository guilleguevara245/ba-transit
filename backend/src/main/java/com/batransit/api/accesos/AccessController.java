package com.batransit.api.accesos;

import com.batransit.api.accesos.AccessModels.AccessesResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/accesos")
public class AccessController {

    private final AccessService service;

    public AccessController(AccessService service) {
        this.service = service;
    }

    /** Estado de los cuatro accesos principales (se actualiza cada 20 minutos). */
    @GetMapping
    public AccessesResponse accesses() {
        return service.report();
    }
}
