package com.supertrace.aitrace.service.storage.impl;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.ObjectMetadata;
import com.aliyun.oss.model.OSSObject;
import com.supertrace.aitrace.config.OssClientConfig;
import com.supertrace.aitrace.domain.core.storage.S3CompatibleObject;
import com.supertrace.aitrace.repository.S3CompatibleObjectRepository;
import com.supertrace.aitrace.service.storage.PayloadCodec;
import com.supertrace.aitrace.service.storage.PayloadFormat;
import com.supertrace.aitrace.service.storage.S3CompatibleObjectService;
import com.supertrace.aitrace.service.storage.model.StepPayload;
import com.supertrace.aitrace.service.storage.model.StepPayloadChunk;
import com.supertrace.aitrace.service.storage.model.StepPayloadChunkEntry;
import com.supertrace.aitrace.service.storage.model.TracePayload;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Alibaba OSS implementation of {@link S3CompatibleObjectService}.
 *
 * <p>Step and Trace payloads are encoded by {@link PayloadCodec}, stored in OSS under keys generated
 * by {@link PayloadFormat}, and described by metadata in the {@code s3_compatible_object} table.
 * This implementation is enabled when {@code mwin.object-storage.provider=oss}.</p>
 */
@Service
@ConditionalOnProperty(
    prefix = "mwin.object-storage",
    name = "provider",
    havingValue = "oss",
    matchIfMissing = true
)
public class OSSObjectServiceImpl implements S3CompatibleObjectService {
    private static final String CONTENT_TYPE = "application/gzip";
    private static final String CONTENT_ENCODING = "gzip";
    private final S3CompatibleObjectRepository repository;
    private final PayloadCodec payloadCodec;
    private final String endpoint;
    private final String bucket;
    private final String accessKeyId;
    private final String accessKeySecret;
    private final long maxStoredSizeBytes;
    private volatile OSS ossClient;

    /**
     * Creates the OSS-backed object service from application configuration.
     *
     * @param repository metadata repository for stored objects
     * @param payloadCodec codec used to serialize and gzip payloads
     * @param endpoint Alibaba OSS endpoint
     * @param bucket OSS bucket name
     * @param accessKeyId Alibaba Cloud access key ID
     * @param accessKeySecret Alibaba Cloud access key secret
     * @param maxStoredSizeBytes maximum number of compressed bytes accepted for one object
     */
    public OSSObjectServiceImpl(
        S3CompatibleObjectRepository repository,
        PayloadCodec payloadCodec,
        @Value("${mwin.oss.endpoint}") String endpoint,
        @Value("${mwin.oss.bucket}") String bucket,
        @Value("${mwin.oss.access-key-id}") String accessKeyId,
        @Value("${mwin.oss.access-key-secret}") String accessKeySecret,
        @Value("${mwin.oss.max-stored-size-bytes}") long maxStoredSizeBytes
    ) {
        this.repository = repository;
        this.payloadCodec = payloadCodec;
        this.endpoint = endpoint;
        this.bucket = bucket;
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
        this.maxStoredSizeBytes = maxStoredSizeBytes;
    }

    /**
     * Encodes and stores a Step payload in OSS.
     *
     * @param stepId Step identifier used to generate the object key
     * @param payload complete Step input and output payload
     * @return object key saved on the Step record
     */
    @Override
    public String storeStepPayload(UUID stepId, StepPayload payload) {
        return store(
            PayloadFormat.stepObjectKey(stepId),
            PayloadFormat.CURRENT_VERSION,
            payloadCodec.encodeStep(payload)
        );
    }

    @Override
    public String storeStepPayloadChunk(List<StepPayloadChunkEntry> entries) {
        return store(
            PayloadFormat.stepChunkObjectKey(entries.get(0).id()),
            PayloadFormat.STEP_CHUNK_VERSION,
            payloadCodec.encodeStepChunk(new StepPayloadChunk(entries))
        );
    }

    /**
     * Encodes and stores a Trace payload in OSS.
     *
     * @param traceId Trace identifier used to generate the object key
     * @param payload complete Trace input and output payload
     * @return object key saved on the Trace record
     */
    @Override
    public String storeTracePayload(UUID traceId, TracePayload payload) {
        return store(
            PayloadFormat.traceObjectKey(traceId),
            PayloadFormat.CURRENT_VERSION,
            payloadCodec.encodeTrace(payload)
        );
    }

    /**
     * Loads and decodes a Step payload using its object key.
     *
     * @param objectKey key stored on the Step record
     * @param stepId Step identifier used to select an entry from a chunk
     * @return decoded Step payload
     */
    @Override
    public StepPayload loadStepPayload(String objectKey, UUID stepId) {
        S3CompatibleObject object = findMetadata(objectKey);
        byte[] compressed = loadCompressed(object);
        if (object.getSchemaVersion() == PayloadFormat.CURRENT_VERSION) {
            return payloadCodec.decodeStep(compressed, object.getSha256(), object.getSchemaVersion());
        }
        if (object.getSchemaVersion() == PayloadFormat.STEP_CHUNK_VERSION) {
            return payloadCodec.decodeStepChunk(compressed, object.getSha256(), object.getSchemaVersion())
                .steps()
                .stream()
                .filter(entry -> entry.id().equals(stepId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Step payload not found in chunk: " + stepId))
                .toStepPayload();
        }
        throw new IllegalStateException(
            "Unsupported stored payload schema version: " + object.getSchemaVersion()
        );
    }

    /**
     * Loads and decodes a Trace payload using its object key.
     *
     * @param objectKey key stored on the Trace record
     * @return decoded Trace payload
     */
    @Override
    public TracePayload loadTracePayload(String objectKey) {
        S3CompatibleObject object = findMetadata(objectKey);
        byte[] compressed = loadCompressed(object);
        return payloadCodec.decodeTrace(compressed, object.getSha256(), object.getSchemaVersion());
    }

    /** Returns the database metadata required to locate and validate an OSS object. */
    private S3CompatibleObject findMetadata(String objectKey) {
        return repository.findById(objectKey)
            .orElseThrow(() -> new IllegalStateException("Payload metadata not found: " + objectKey));
    }

    /** Downloads a compressed object while enforcing the configured stored-size limit. */
    private byte[] loadCompressed(S3CompatibleObject object) {
        OSS oss = requireClient();
        OSSObject ossObject = oss.getObject(bucket, object.getObjectKey());
        long contentLength = ossObject.getObjectMetadata().getContentLength();
        if (contentLength > maxStoredSizeBytes) {
            throw new IllegalArgumentException(
                "Stored payload exceeds the configured limit of " + maxStoredSizeBytes + " bytes");
        }
        try (InputStream input = ossObject.getObjectContent()) {
            return readLimited(input, maxStoredSizeBytes);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read payload from OSS", e);
        }
    }

    /**
     * Uploads an encoded payload and records the metadata needed for later validation and decoding.
     *
     * @param objectKey destination key in the configured bucket
     * @param payload encoded JSON and its gzip representation
     * @return the stored object key
     */
    private String store(String objectKey, int schemaVersion, PayloadCodec.EncodedPayload payload) {
        if (payload.compressed().length > maxStoredSizeBytes) {
            throw new IllegalArgumentException(
                "Compressed payload exceeds the configured limit of " + maxStoredSizeBytes + " bytes");
        }

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(CONTENT_TYPE);
        metadata.setContentLength(payload.compressed().length);
        requireClient().putObject(
            bucket,
            objectKey,
            new ByteArrayInputStream(payload.compressed()),
            metadata
        );

        LocalDateTime now = LocalDateTime.now();
        S3CompatibleObject object = repository.findById(objectKey)
            .orElseGet(() -> S3CompatibleObject.builder()
                .objectKey(objectKey)
                .createdAt(now)
                .build());
        object.setContentType(CONTENT_TYPE);
        object.setContentEncoding(CONTENT_ENCODING);
        object.setSchemaVersion(schemaVersion);
        object.setRawSizeBytes((long) payload.raw().length);
        object.setStoredSizeBytes((long) payload.compressed().length);
        object.setSha256(payload.sha256());
        object.setUpdatedAt(now);
        repository.saveAndFlush(object);
        return objectKey;
    }

    /** Returns the shared OSS client, creating it lazily after validating the configured credentials. */
    private OSS requireClient() {
        if (!StringUtils.hasText(accessKeyId) || !StringUtils.hasText(accessKeySecret)) {
            throw new IllegalStateException("Alibaba OSS credentials are not configured");
        }
        OSS current = ossClient;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (ossClient == null) {
                ossClient = OssClientConfig.createClient(endpoint, accessKeyId, accessKeySecret);
            }
            return ossClient;
        }
    }

    /** Closes the OSS client during Spring application shutdown if it was initialized. */
    @PreDestroy
    public void shutdown() {
        OSS current = ossClient;
        if (current != null) {
            current.shutdown();
        }
    }

    /** Reads an object stream without allowing more than {@code limit} bytes into memory. */
    private static byte[] readLimited(InputStream input, long limit) throws IOException {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            long total = 0;
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > limit) {
                    throw new IllegalArgumentException(
                        "Stored payload exceeds the configured limit of " + limit + " bytes");
                }
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }
}
