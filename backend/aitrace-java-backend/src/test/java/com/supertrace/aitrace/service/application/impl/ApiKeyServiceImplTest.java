package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.ApiKey;
import com.supertrace.aitrace.repository.ApiKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApiKeyServiceImplTest {

    @Mock
    private ApiKeyRepository apiKeyRepository;

    @InjectMocks
    private ApiKeyServiceImpl service;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    // ── generateAndStoreApiKey ────────────────────────────────────────────────

    @Test
    void generateAndStoreApiKey_startsWithAtPrefix() {
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of());
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String key = service.generateAndStoreApiKey(userId);

        assertTrue(key.startsWith("at-"), "API key must start with 'at-'");
    }

    @Test
    void generateAndStoreApiKey_keyHasExpectedLength() {
        // "at-" (3) + 32 hex chars = 35 total
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of());
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String key = service.generateAndStoreApiKey(userId);

        assertEquals(35, key.length(), "API key must be 35 characters long");
    }

    @Test
    void generateAndStoreApiKey_deletesOldKeysBeforeSavingNew() {
        ApiKey oldKey = ApiKey.builder().key("at-old").userId(userId).build();
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of(oldKey));
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.generateAndStoreApiKey(userId);

        verify(apiKeyRepository).deleteAll(List.of(oldKey));
    }

    @Test
    void generateAndStoreApiKey_noOldKeys_doesNotCallDeleteAll() {
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of());
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.generateAndStoreApiKey(userId);

        verify(apiKeyRepository, never()).deleteAll(any());
    }

    @Test
    void generateAndStoreApiKey_savesNewKeyWithCorrectUserId() {
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of());
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.generateAndStoreApiKey(userId);

        ArgumentCaptor<ApiKey> captor = ArgumentCaptor.forClass(ApiKey.class);
        verify(apiKeyRepository).save(captor.capture());
        assertEquals(userId, captor.getValue().getUserId());
    }

    @Test
    void generateAndStoreApiKey_twoCallsProduce_differentKeys() {
        when(apiKeyRepository.findApiKeyByUserId(any())).thenReturn(List.of());
        when(apiKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String key1 = service.generateAndStoreApiKey(UUID.randomUUID());
        String key2 = service.generateAndStoreApiKey(UUID.randomUUID());

        assertNotEquals(key1, key2);
    }

    // ── isApiKeyExist ─────────────────────────────────────────────────────────

    @Test
    void isApiKeyExist_keyFound_returnsTrue() {
        String key = "at-abc123";
        ApiKey stored = ApiKey.builder().key(key).userId(userId).build();
        when(apiKeyRepository.findApiKeyByKey(key)).thenReturn(List.of(stored));

        assertTrue(service.isApiKeyExist(key));
    }

    @Test
    void isApiKeyExist_emptyList_returnsFalse() {
        when(apiKeyRepository.findApiKeyByKey(anyString())).thenReturn(List.of());

        assertFalse(service.isApiKeyExist("at-nonexistent"));
    }

    @Test
    void isApiKeyExist_keyInListButDifferentValue_returnsFalse() {
        // Repository returns a record whose key doesn't match what was queried
        // (edge case: findApiKeyByKey could theoretically return mismatched records)
        ApiKey stored = ApiKey.builder().key("at-different").userId(userId).build();
        when(apiKeyRepository.findApiKeyByKey("at-queried")).thenReturn(List.of(stored));

        assertFalse(service.isApiKeyExist("at-queried"));
    }

    // ── resolveUserIdFromApiKey ───────────────────────────────────────────────

    @Test
    void resolveUserIdFromApiKey_delegatesToRepository() {
        String key = "at-testkey";
        when(apiKeyRepository.findUserIdByKey(key)).thenReturn(Optional.of(userId));

        Optional<UUID> result = service.resolveUserIdFromApiKey(key);

        assertTrue(result.isPresent());
        assertEquals(userId, result.get());
    }

    @Test
    void resolveUserIdFromApiKey_notFound_returnsEmpty() {
        when(apiKeyRepository.findUserIdByKey(anyString())).thenReturn(Optional.empty());

        Optional<UUID> result = service.resolveUserIdFromApiKey("at-unknown");

        assertTrue(result.isEmpty());
    }

    // ── getUserLatestApiKey ───────────────────────────────────────────────────

    @Test
    void getUserLatestApiKey_keysExist_returnsFirstKey() {
        ApiKey key1 = ApiKey.builder().key("at-first").userId(userId).build();
        ApiKey key2 = ApiKey.builder().key("at-second").userId(userId).build();
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of(key1, key2));

        Optional<String> result = service.getUserLatestApiKey(userId);

        assertTrue(result.isPresent());
        assertEquals("at-first", result.get());
    }

    @Test
    void getUserLatestApiKey_noKeys_returnsEmpty() {
        when(apiKeyRepository.findApiKeyByUserId(userId)).thenReturn(List.of());

        Optional<String> result = service.getUserLatestApiKey(userId);

        assertTrue(result.isEmpty());
    }

    // ── isApiKeyOwnedByUser ───────────────────────────────────────────────────

    @Test
    void isApiKeyOwnedByUser_currentlyNotImplemented_returnsFalse() {
        // This is documented as not implemented. The test guards against inadvertent
        // "fixes" that break callers expecting false.
        assertFalse(service.isApiKeyOwnedByUser("at-any", userId));
    }
}
