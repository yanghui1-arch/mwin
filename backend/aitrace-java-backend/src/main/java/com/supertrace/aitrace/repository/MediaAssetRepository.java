package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.media.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
    Optional<MediaAsset> findByIdAndUserId(UUID id, UUID userId);
}
