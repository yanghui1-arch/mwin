package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.media.MediaAsset;
import com.supertrace.aitrace.repository.MediaAssetRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
public class MediaService {
    private static final Map<String, String> IMAGE_EXTENSIONS = Map.of(
        "image/png", "png",
        "image/jpeg", "jpg",
        "image/gif", "gif",
        "image/webp", "webp"
    );

    private final MediaAssetRepository mediaAssetRepository;
    private final ProjectService projectService;
    private final Path rootDir;
    private final long maxSizeBytes;

    public MediaService(
        MediaAssetRepository mediaAssetRepository,
        ProjectService projectService,
        @Value("${mwin.media.root-dir}") String rootDir,
        @Value("${mwin.media.max-size-bytes}") long maxSizeBytes
    ) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.projectService = projectService;
        this.rootDir = Path.of(rootDir);
        this.maxSizeBytes = maxSizeBytes;
    }

    /**
     * Persist one tracked image and its ownership metadata.
     *
     * The binary is stored below the configured media root. PostgreSQL stores
     * only the relative storage key so deployments can move the media root.
     *
     * @param userId owner resolved from the mwin API key
     * @param projectName project receiving the tracked step
     * @param file image uploaded by the Python SDK
     * @return persisted media metadata used to build the read URL
     */
    @Transactional(rollbackFor = Exception.class)
    public MediaAsset storeImage(UUID userId, String projectName, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException("Image exceeds the configured size limit");
        }

        String mimeType = file.getContentType();
        String extension = IMAGE_EXTENSIONS.get(mimeType);
        if (extension == null) {
            throw new IllegalArgumentException("Unsupported image format");
        }

        var project = projectService.getProjectByUserIdAndName(userId, projectName)
            .orElseGet(() -> projectService.createNewProjectByProgram(projectName, userId));
        UUID mediaId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        String storageKey = String.format(
            "%d/%04d/%02d/%s.%s",
            project.getId(), today.getYear(), today.getMonthValue(), mediaId, extension
        );
        // Keep only this relative key in PostgreSQL so the media root can move.
        Path path = rootDir.resolve(storageKey);

        try {
            Files.createDirectories(path.getParent());
            Files.write(path, file.getBytes());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to persist image", e);
        }

        return mediaAssetRepository.save(MediaAsset.builder()
            .id(mediaId)
            .projectId(project.getId())
            .userId(userId)
            .storageKey(storageKey)
            .mimeType(mimeType)
            .sizeBytes(file.getSize())
            .build());
    }

    /**
     * Resolve media owned by a user into metadata and a file resource.
     *
     * @param userId authenticated dashboard user
     * @param mediaId media identifier stored in the tracked OpenAI input
     * @return metadata and local file resource for the HTTP response
     */
    public MediaContent loadImage(UUID userId, UUID mediaId) {
        MediaAsset asset = mediaAssetRepository.findByIdAndUserId(mediaId, userId)
            .orElseThrow(() -> new IllegalArgumentException("Media not found"));
        return new MediaContent(asset, new FileSystemResource(rootDir.resolve(asset.getStorageKey())));
    }

    public record MediaContent(MediaAsset asset, Resource resource) {}
}
