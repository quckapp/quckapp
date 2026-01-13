package com.quikapp.permission.domain.repository;

import com.quikapp.permission.domain.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByWorkspaceId(UUID workspaceId);
    Optional<Role> findByWorkspaceIdAndName(UUID workspaceId, String name);
    boolean existsByWorkspaceIdAndName(UUID workspaceId, String name);
    List<Role> findByWorkspaceIdAndIsSystemTrue(UUID workspaceId);

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.id = :id")
    Optional<Role> findByIdWithPermissions(@Param("id") UUID id);

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.workspaceId = :workspaceId")
    List<Role> findByWorkspaceIdWithPermissions(@Param("workspaceId") UUID workspaceId);
}
