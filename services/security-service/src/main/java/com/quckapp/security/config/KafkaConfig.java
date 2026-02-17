package com.quckapp.security.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Value("${kafka.topics.security-threats:security.threats}")
    private String securityThreatsTopic;

    @Value("${kafka.topics.security-audit:security.audit}")
    private String securityAuditTopic;

    @Bean
    public NewTopic securityThreatsTopic() {
        return TopicBuilder.name(securityThreatsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic securityAuditTopic() {
        return TopicBuilder.name(securityAuditTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
