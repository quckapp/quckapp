package com.quckapp.security.audit.repository;

import com.quckapp.security.audit.model.ComplianceReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplianceReportRepository extends JpaRepository<ComplianceReport, String> {

    Page<ComplianceReport> findByReportType(String reportType, Pageable pageable);

    Page<ComplianceReport> findByStatus(String status, Pageable pageable);

    List<ComplianceReport> findByReportTypeAndStatusOrderByCreatedAtDesc(String reportType, String status);
}
