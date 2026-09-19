package com.batransit.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BaTransitApplication {

    public static void main(String[] args) {
        SpringApplication.run(BaTransitApplication.class, args);
    }
}
