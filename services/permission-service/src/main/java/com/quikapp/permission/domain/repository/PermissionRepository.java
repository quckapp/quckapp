package com.quikapp.permission.domain.repository;

import com.quikapp.permission.domain.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByResourceAndAction(String resource, String action);
    List<Permission> findByResource(String resource);
    boolean existsByResourceAndAction(String resource, String action);
    List<Permission> findByIdIn(List<UUID> ids);
}
