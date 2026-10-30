package com.batransit.api.noticias;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Noticias del transporte del AMBA (titulares con link al medio). */
@RestController
public class NewsController {

    private final NewsService news;

    public NewsController(NewsService news) {
        this.news = news;
    }

    @GetMapping("/api/v1/noticias")
    public NewsService.NewsResponse news() {
        return news.current();
    }
}
