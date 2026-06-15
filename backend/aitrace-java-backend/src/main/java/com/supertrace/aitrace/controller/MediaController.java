package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.domain.core.media.MediaAsset;
import com.supertrace.aitrace.exception.AuthenticationException;
import com.supertrace.aitrace.exception.UserIdNotFoundException;
import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.domain.MediaService;
import com.supertrace.aitrace.utils.ApiKeyUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v0/media")
@RequiredArgsConstructor
public class MediaController {
    private final MediaService mediaService;
    private final ApiKeyService apiKeyService;

    /**
     * Accept an SDK image upload authenticated by the user's mwin API key.
     *
     * @return the URL written into the tracked OpenAI image_url field
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<APIResponse<UploadResponse>> upload(
        @RequestHeader(value = "Authorization") String authorization,
        @RequestParam("project_name") String projectName,
        @RequestParam("file") MultipartFile file
    ) {
        try {
            String apiKey = ApiKeyUtils.extractApiKeyFromHttpHeader(authorization);
            if (!apiKeyService.isApiKeyExist(apiKey)) {
                throw new AuthenticationException();
            }
            UUID userId = apiKeyService.resolveUserIdFromApiKey(apiKey)
                .orElseThrow(UserIdNotFoundException::new);
            MediaAsset asset = mediaService.storeImage(userId, projectName, file);
            return ResponseEntity.ok(APIResponse.success(
                new UploadResponse("/api/v0/media/" + asset.getId())
            ));
        } catch (AuthenticationException | UserIdNotFoundException e) {
            return ResponseEntity.badRequest().body(APIResponse.error("Invalid mwin API key"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /**
     * Stream a tracked image after the normal dashboard JWT filter resolves
     * the requesting user.
     */
    @GetMapping("/{mediaId}")
    public ResponseEntity<?> get(HttpServletRequest request, @PathVariable UUID mediaId) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            MediaService.MediaContent content = mediaService.loadImage(userId, mediaId);
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.asset().getMimeType()))
                .contentLength(content.asset().getSizeBytes())
                .cacheControl(CacheControl.noCache().cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(content.resource());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    public record UploadResponse(String url) {}
}
