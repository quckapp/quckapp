package com.quikapp.permission.domain.repository;

import com.quikapp.permission.domain.entity.UserRole;
import com.quikapp.permission.domain.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByUserId(UUID userId);
    List<UserRole> findByUserIdAndWorkspaceId(UUID userId, UUID workspaceId);
    List<UserRole> findByWorkspaceIdAndRoleId(UUID workspaceId, UUID roleId);
    void deleteByUserIdAndWorkspaceId(UUID userId, UUID workspaceId);
    void deleteByUserIdAndRoleIdAndWorkspaceId(UUID userId, UUID roleId, UUID workspaceId);
    boolean existsByUserIdAndRoleIdAndWorkspaceId(UUID userId, UUID roleId, UUID workspaceId);

    @Query("SELECT ur FROM UserRole ur JOIN FETCH ur.role r LEFT JOIN FETCH r.permissions WHERE ur.userId = :userId AND ur.workspaceId = :workspaceId")
    List<UserRole> findByUserIdAndWorkspaceIdWithRoleAndPermissions(@Param("userId") UUID userId, @Param("workspaceId") UUID workspaceId);
}
