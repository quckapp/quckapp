package com.quikapp.user.service;

import com.quikapp.user.domain.entity.User;
import com.quikapp.user.domain.entity.User.UserStatus;
import com.quikapp.user.domain.entity.UserPreferences;
import com.quikapp.user.domain.entity.UserProfile;
import com.quikapp.user.domain.repository.*;
import com.quikapp.user.dto.UserDtos.*;
import com.quikapp.user.exception.*;
import com.quikapp.user.kafka.UserEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final UserPreferencesRepository preferencesRepository;
    private final UserEventPublisher eventPublisher;

    public UserResponse createUser(CreateUserRequest request) {
        log.info("Creating user with email: {}", request.getEmail());
        if (userRepository.existsByEmail(request.getEmail())) throw new DuplicateResourceException("Email already exists");
        if (userRepository.existsByUsername(request.getUsername())) throw new DuplicateResourceException("Username already exists");

        User user = User.builder()
            .email(request.getEmail().toLowerCase())
            .username(request.getUsername().toLowerCase())
            .displayName(request.getDisplayName())
            .avatarUrl(request.getAvatarUrl())
            .phone(request.getPhone())
            .timezone(request.getTimezone() != null ? request.getTimezone() : "UTC")
            .locale(request.getLocale() != null ? request.getLocale() : "en")
            .build();
        user = userRepository.save(user);

        profileRepository.save(UserProfile.builder().user(user).build());
        preferencesRepository.save(UserPreferences.builder().user(user).build());
        eventPublisher.publishUserCreated(user);

        return mapToUserResponse(user);
    }

    @Cacheable(value = "users", key = "#id")
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        return mapToUserResponse(userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        return mapToUserResponse(userRepository.findByEmail(email.toLowerCase()).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        return mapToUserResponse(userRepository.findByUsername(username.toLowerCase()).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @CacheEvict(value = "users", key = "#id")
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (request.getDisplayName() != null) user.setDisplayName(request.getDisplayName());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getTimezone() != null) user.setTimezone(request.getTimezone());
        if (request.getLocale() != null) user.setLocale(request.getLocale());
        user = userRepository.save(user);
        eventPublisher.publishUserUpdated(user);
        return mapToUserResponse(user);
    }

    @CacheEvict(value = "users", key = "#id")
    public void deactivateUser(UUID id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus(UserStatus.INACTIVE);
        userRepository.save(user);
        eventPublisher.publishUserDeactivated(user);
    }

    @CacheEvict(value = "users", key = "#id")
    public void suspendUser(UUID id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);
        eventPublisher.publishUserSuspended(user);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryResponse> searchUsers(SearchUsersRequest request) {
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by("displayName"));
        Page<User> users = request.getStatus() != null
            ? userRepository.searchUsers(request.getQuery(), request.getStatus(), pageable)
            : userRepository.searchAllUsers(request.getQuery(), pageable);
        return PageResponse.<UserSummaryResponse>builder()
            .content(users.getContent().stream().map(this::mapToUserSummaryResponse).toList())
            .page(users.getNumber()).size(users.getSize()).totalElements(users.getTotalElements())
            .totalPages(users.getTotalPages()).first(users.isFirst()).last(users.isLast()).build();
    }

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsersByIds(List<UUID> ids) {
        return userRepository.findByIdIn(ids).stream().map(this::mapToUserSummaryResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId) {
        User user = userRepository.findByIdWithProfile(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserProfile profile = user.getProfile();
        if (profile == null) { profile = profileRepository.save(UserProfile.builder().user(user).build()); }
        return mapToProfileResponse(profile);
    }

    @CacheEvict(value = "users", key = "#userId")
    public ProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findByIdWithProfile(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserProfile profile = user.getProfile() != null ? user.getProfile() : UserProfile.builder().user(user).build();
        if (request.getTitle() != null) profile.setTitle(request.getTitle());
        if (request.getDepartment() != null) profile.setDepartment(request.getDepartment());
        if (request.getLocation() != null) profile.setLocation(request.getLocation());
        if (request.getBio() != null) profile.setBio(request.getBio());
        if (request.getCustomStatus() != null) profile.setCustomStatus(request.getCustomStatus());
        if (request.getStatusEmoji() != null) profile.setStatusEmoji(request.getStatusEmoji());
        if (request.getStatusExpiry() != null) profile.setStatusExpiry(request.getStatusExpiry());
        if (request.getPronouns() != null) profile.setPronouns(request.getPronouns());
        if (request.getBirthday() != null) profile.setBirthday(request.getBirthday());
        if (request.getLinkedinUrl() != null) profile.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getTwitterUrl() != null) profile.setTwitterUrl(request.getTwitterUrl());
        if (request.getGithubUrl() != null) profile.setGithubUrl(request.getGithubUrl());
        profile = profileRepository.save(profile);
        eventPublisher.publishProfileUpdated(userId, profile);
        return mapToProfileResponse(profile);
    }

    @Transactional(readOnly = true)
    public PreferencesResponse getPreferences(UUID userId) {
        User user = userRepository.findByIdWithPreferences(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserPreferences pref = user.getPreferences();
        if (pref == null) { pref = preferencesRepository.save(UserPreferences.builder().user(user).build()); }
        return mapToPreferencesResponse(pref);
    }

    @CacheEvict(value = "users", key = "#userId")
    public PreferencesResponse updatePreferences(UUID userId, UpdatePreferencesRequest request) {
        User user = userRepository.findByIdWithPreferences(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserPreferences pref = user.getPreferences() != null ? user.getPreferences() : UserPreferences.builder().user(user).build();
        if (request.getPushEnabled() != null) pref.setPushEnabled(request.getPushEnabled());
        if (request.getEmailEnabled() != null) pref.setEmailEnabled(request.getEmailEnabled());
        if (request.getSmsEnabled() != null) pref.setSmsEnabled(request.getSmsEnabled());
        if (request.getTheme() != null) pref.setTheme(request.getTheme());
        if (request.getLanguage() != null) pref.setLanguage(request.getLanguage());
        if (request.getShowOnlineStatus() != null) pref.setShowOnlineStatus(request.getShowOnlineStatus());
        if (request.getFontSize() != null) pref.setFontSize(request.getFontSize());
        if (request.getCustomSettings() != null) pref.setCustomSettings(request.getCustomSettings());
        pref = preferencesRepository.save(pref);
        eventPublisher.publishPreferencesUpdated(userId, pref);
        return mapToPreferencesResponse(pref);
    }

    private UserResponse mapToUserResponse(User u) {
        return UserResponse.builder().id(u.getId()).email(u.getEmail()).username(u.getUsername())
            .displayName(u.getDisplayName()).avatarUrl(u.getAvatarUrl()).phone(u.getPhone())
            .timezone(u.getTimezone()).locale(u.getLocale()).status(u.getStatus())
            .emailVerified(u.isEmailVerified()).phoneVerified(u.isPhoneVerified())
            .lastLoginAt(u.getLastLoginAt()).createdAt(u.getCreatedAt()).updatedAt(u.getUpdatedAt()).build();
    }

    private UserSummaryResponse mapToUserSummaryResponse(User u) {
        return UserSummaryResponse.builder().id(u.getId()).username(u.getUsername())
            .displayName(u.getEffectiveDisplayName()).avatarUrl(u.getAvatarUrl()).status(u.getStatus()).build();
    }

    private ProfileResponse mapToProfileResponse(UserProfile p) {
        return ProfileResponse.builder().userId(p.getUserId()).title(p.getTitle()).department(p.getDepartment())
            .location(p.getLocation()).bio(p.getBio()).customStatus(p.getCustomStatus())
            .statusEmoji(p.getStatusEmoji()).statusExpiry(p.getStatusExpiry()).pronouns(p.getPronouns())
            .birthday(p.getBirthday()).linkedinUrl(p.getLinkedinUrl()).twitterUrl(p.getTwitterUrl())
            .githubUrl(p.getGithubUrl()).updatedAt(p.getUpdatedAt()).build();
    }

    private PreferencesResponse mapToPreferencesResponse(UserPreferences p) {
        return PreferencesResponse.builder().userId(p.getUserId()).pushEnabled(p.isPushEnabled())
            .emailEnabled(p.isEmailEnabled()).smsEnabled(p.isSmsEnabled()).theme(p.getTheme())
            .language(p.getLanguage()).showOnlineStatus(p.isShowOnlineStatus()).fontSize(p.getFontSize())
            .customSettings(p.getCustomSettings()).updatedAt(p.getUpdatedAt()).build();
    }
}
