package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.dto.project.CreateProjectRequest;
import com.supertrace.aitrace.exception.ProjectNotFoundException;
import com.supertrace.aitrace.exception.project.DuplicateProjectNameException;
import com.supertrace.aitrace.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private ProjectServiceImpl service;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    private Project buildProject(Long id, String name) {
        return Project.builder()
            .id(id)
            .userId(userId)
            .name(name)
            .description("desc")
            .averageDuration(0)
            .cost(BigDecimal.ZERO)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
    }

    // ── createNewProjectByManualCreation ──────────────────────────────────────

    @Test
    void createNewProjectByManualCreation_success_savesAndReturnsProject() {
        CreateProjectRequest req = new CreateProjectRequest();
        req.setProjectName("new-project");
        req.setProjectDescription("description");

        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of());
        when(projectRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Project result = service.createNewProjectByManualCreation(req, userId);

        assertNotNull(result);
        assertEquals("new-project", result.getName());
        assertEquals("description", result.getDescription());
        assertEquals(userId, result.getUserId());
        assertEquals(BigDecimal.ZERO, result.getCost());
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void createNewProjectByManualCreation_duplicateName_throwsDuplicateProjectNameException() {
        CreateProjectRequest req = new CreateProjectRequest();
        req.setProjectName("existing");
        req.setProjectDescription("desc");

        when(projectRepository.findProjectsByUserId(userId))
            .thenReturn(List.of(buildProject(1L, "existing")));

        assertThrows(DuplicateProjectNameException.class,
            () -> service.createNewProjectByManualCreation(req, userId));

        verify(projectRepository, never()).save(any());
    }

    // ── createNewProjectByProgram ─────────────────────────────────────────────

    @Test
    void createNewProjectByProgram_newName_savesProject() {
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of());
        when(projectRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Project result = service.createNewProjectByProgram("auto-project", userId);

        assertNotNull(result);
        assertEquals("auto-project", result.getName());
        assertNull(result.getDescription(), "Program-created projects have no description");
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void createNewProjectByProgram_duplicateName_throwsDuplicateProjectNameException() {
        when(projectRepository.findProjectsByUserId(userId))
            .thenReturn(List.of(buildProject(1L, "auto-project")));

        assertThrows(DuplicateProjectNameException.class,
            () -> service.createNewProjectByProgram("auto-project", userId));
    }

    // ── getProjectsByUserId ───────────────────────────────────────────────────

    @Test
    void getProjectsByUserId_delegatesOrderedQueryToRepository() {
        List<Project> expected = List.of(buildProject(1L, "p1"), buildProject(2L, "p2"));
        when(projectRepository.findProjectsByUserIdOrderByLastUpdateTimestampDesc(userId))
            .thenReturn(expected);

        List<Project> result = service.getProjectsByUserId(userId);

        assertEquals(expected, result);
    }

    // ── getProjectByUserIdAndName ─────────────────────────────────────────────

    @Test
    void getProjectByUserIdAndName_found_returnsProject() {
        Project p = buildProject(1L, "target");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(p));

        Optional<Project> result = service.getProjectByUserIdAndName(userId, "target");

        assertTrue(result.isPresent());
        assertEquals("target", result.get().getName());
    }

    @Test
    void getProjectByUserIdAndName_notFound_returnsEmpty() {
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of());

        Optional<Project> result = service.getProjectByUserIdAndName(userId, "missing");

        assertTrue(result.isEmpty());
    }

    @Test
    void getProjectByUserIdAndName_multipleProjects_returnsMatchingOne() {
        Project p1 = buildProject(1L, "alpha");
        Project p2 = buildProject(2L, "beta");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(p1, p2));

        Optional<Project> result = service.getProjectByUserIdAndName(userId, "beta");

        assertTrue(result.isPresent());
        assertEquals("beta", result.get().getName());
    }

    // ── updateProject ─────────────────────────────────────────────────────────

    @Test
    void updateProject_success_updatesDescriptionAndTimestamp() {
        Project existing = buildProject(10L, "my-project");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(existing));
        when(projectRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        Project updated = service.updateProject(userId, 10L, "new description");
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);

        assertEquals("new description", updated.getDescription());
        // lastUpdateTimestamp must be refreshed (between before and after)
        assertNotNull(updated.getLastUpdateTimestamp());
        assertTrue(updated.getLastUpdateTimestamp().isAfter(before) ||
                   updated.getLastUpdateTimestamp().isEqual(before));
        assertTrue(updated.getLastUpdateTimestamp().isBefore(after) ||
                   updated.getLastUpdateTimestamp().isEqual(after));
    }

    @Test
    void updateProject_nullDescription_isAccepted() {
        Project existing = buildProject(10L, "my-project");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(existing));
        when(projectRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Project updated = service.updateProject(userId, 10L, null);
        assertNull(updated.getDescription());
    }

    @Test
    void updateProject_projectNotFound_throwsProjectNotFoundException() {
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of());

        assertThrows(ProjectNotFoundException.class,
            () -> service.updateProject(userId, 99L, "desc"));

        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_wrongProjectId_throwsProjectNotFoundException() {
        Project existing = buildProject(10L, "my-project");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(existing));

        assertThrows(ProjectNotFoundException.class,
            () -> service.updateProject(userId, 999L, "desc"));
    }

    // ── deleteProject ─────────────────────────────────────────────────────────

    @Test
    void deleteProject_found_deletesAndReturnsProject() {
        Project p = buildProject(5L, "to-delete");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(p));

        Project deleted = service.deleteProject(userId, "to-delete");

        assertEquals("to-delete", deleted.getName());
        verify(projectRepository).deleteById(5L);
    }

    @Test
    void deleteProject_noProjects_throwsIllegalArgumentException() {
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of());

        assertThrows(IllegalArgumentException.class,
            () -> service.deleteProject(userId, "any"));

        verify(projectRepository, never()).deleteById(any());
    }

    @Test
    void deleteProject_projectNameNotFound_throwsIllegalArgumentException() {
        Project p = buildProject(1L, "other-project");
        when(projectRepository.findProjectsByUserId(userId)).thenReturn(List.of(p));

        assertThrows(IllegalArgumentException.class,
            () -> service.deleteProject(userId, "nonexistent"));

        verify(projectRepository, never()).deleteById(any());
    }
}
