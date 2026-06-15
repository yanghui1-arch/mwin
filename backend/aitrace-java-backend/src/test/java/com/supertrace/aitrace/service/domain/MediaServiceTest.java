package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.media.MediaAsset;
import com.supertrace.aitrace.repository.MediaAssetRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MediaServiceTest {
    @TempDir
    Path tempDir;

    @Test
    void storeAndLoadImage() throws Exception {
        MediaAssetRepository repository = mock(MediaAssetRepository.class);
        ProjectService projectService = mock(ProjectService.class);
        UUID userId = UUID.randomUUID();
        Project project = Project.builder().id(12L).userId(userId).name("demo").build();
        byte[] image = new byte[] {1, 2, 3};

        when(projectService.getProjectByUserIdAndName(userId, "demo")).thenReturn(Optional.of(project));
        when(repository.save(any(MediaAsset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MediaService service = new MediaService(repository, projectService, tempDir.toString(), 1024);
        MediaAsset stored = service.storeImage(
            userId,
            "demo",
            new MockMultipartFile("file", "image.png", "image/png", image)
        );

        assertArrayEquals(image, Files.readAllBytes(tempDir.resolve(stored.getStorageKey())));
        assertEquals("image/png", stored.getMimeType());

        when(repository.findByIdAndUserId(stored.getId(), userId)).thenReturn(Optional.of(stored));
        assertArrayEquals(image, service.loadImage(userId, stored.getId()).resource().getInputStream().readAllBytes());
    }

    @Test
    void storeImageRejectsUnsupportedMimeType() {
        MediaService service = new MediaService(
            mock(MediaAssetRepository.class),
            mock(ProjectService.class),
            tempDir.toString(),
            1024
        );

        assertThrows(
            IllegalArgumentException.class,
            () -> service.storeImage(
                UUID.randomUUID(),
                "demo",
                new MockMultipartFile("file", "file.txt", "text/plain", new byte[] {1})
            )
        );
    }
}
