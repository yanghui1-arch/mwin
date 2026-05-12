package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.repository.StepRepository;
import com.supertrace.aitrace.service.application.model.OverviewSummaryData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveQuery;
import com.supertrace.aitrace.service.domain.ProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OverviewServiceImplTest {

    @Mock
    private ProjectService projectService;

    @Mock
    private StepRepository stepRepository;

    @InjectMocks
    private OverviewServiceImpl service;

    private UUID userId;
    private Project project1;
    private Project project2;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        project1 = Project.builder()
            .id(1L)
            .userId(userId)
            .name("p1")
            .cost(BigDecimal.ZERO)
            .averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
        project2 = Project.builder()
            .id(2L)
            .userId(userId)
            .name("p2")
            .cost(BigDecimal.ZERO)
            .averageDuration(0)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
    }

    @Test
    void getSummary_withoutProjects_returnsEmptySummary() {
        when(projectService.getProjectsByUserId(userId)).thenReturn(List.of());

        OverviewSummaryData result = service.getSummary(userId);

        assertEquals(0, result.trackedProjectCount());
        assertEquals(0L, result.lifetimeTotalTokens());
        assertEquals(0L, result.yesterdayTotalTokens());
        assertEquals(0L, result.todayTotalTokens());
        assertNull(result.todayChangePct());
        assertNull(result.yesterdayChangePct());
    }

    @Test
    void getSummary_aggregatesLifetimeAndDailyTokens() {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = List.of(
            summaryRow(today.atStartOfDay().plusHours(1), 100L),
            summaryRow(today.minusDays(1).atStartOfDay().plusHours(2), 60L),
            summaryRow(today.minusDays(2).atStartOfDay().plusHours(3), 30L),
            summaryRow(today.minusDays(10).atStartOfDay().plusHours(4), 10L),
            summaryRow(today.atStartOfDay().plusHours(5), 0L)
        );

        when(projectService.getProjectsByUserId(userId)).thenReturn(List.of(project1, project2));
        when(stepRepository.findTokenSnapshotsByProjectIds(List.of(1L, 2L))).thenReturn(rows);

        OverviewSummaryData result = service.getSummary(userId);

        assertEquals(2, result.trackedProjectCount());
        assertEquals(200L, result.lifetimeTotalTokens());
        assertEquals(60L, result.yesterdayTotalTokens());
        assertEquals(100L, result.todayTotalTokens());
        assertEquals(66.66666666666667, result.todayChangePct());
        assertEquals(100.0, result.yesterdayChangePct());
    }

    @Test
    void calculatePercentageChange_withZeroPreviousValue_returnsNull() {
        assertNull(OverviewServiceImpl.calculatePercentageChange(0L, 50L));
    }

    @Test
    void getTokenCurve_forOneDay_returnsOneSeriesPerProject() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        List<Object[]> rows = List.of(
            curveRow(1L, start.plusHours(1).plusMinutes(15), 30L),
            curveRow(1L, start.plusHours(1).plusMinutes(45), 20L),
            curveRow(2L, start.plusHours(23), 10L)
        );

        when(projectService.getProjectsByUserId(userId)).thenReturn(List.of(project1, project2));
        when(stepRepository.findProjectTokenSnapshotsByProjectIdsAndStartTimeBetween(
            List.of(1L, 2L), start, start.plusDays(1)
        )).thenReturn(rows);

        OverviewTokenCurveData result = service.getTokenCurve(
            userId,
            new OverviewTokenCurveQuery(24, List.of())
        );

        assertEquals(24, result.windowHours());
        assertEquals("hour", result.granularity());
        assertEquals(List.of(1L, 2L), result.projectIds());
        assertEquals(2, result.series().size());
        assertEquals("p1", result.series().get(0).projectName());
        assertEquals(24, result.series().get(0).points().size());
        assertEquals(50L, result.series().get(0).points().get(1).tokens());
        assertEquals(10L, result.series().get(1).points().get(23).tokens());
    }

    @Test
    void getTokenCurve_forSevenDays_filtersRequestedProjects() {
        LocalDateTime start = LocalDate.now().minusDays(6).atStartOfDay();
        List<Object[]> rows = List.of(
            curveRow(2L, start.plusDays(1).plusHours(2), 40L),
            curveRow(2L, start.plusDays(6).plusHours(3), 15L)
        );

        when(projectService.getProjectsByUserId(userId)).thenReturn(List.of(project1, project2));
        when(stepRepository.findProjectTokenSnapshotsByProjectIdsAndStartTimeBetween(
            List.of(2L), start, LocalDate.now().plusDays(1).atStartOfDay()
        )).thenReturn(rows);

        OverviewTokenCurveData result = service.getTokenCurve(
            userId,
            new OverviewTokenCurveQuery(168, List.of(2L, 99L))
        );

        assertEquals(168, result.windowHours());
        assertEquals("day", result.granularity());
        assertEquals(List.of(2L), result.projectIds());
        assertEquals(1, result.series().size());
        assertEquals("p2", result.series().get(0).projectName());
        assertEquals(7, result.series().get(0).points().size());
        assertEquals(40L, result.series().get(0).points().get(1).tokens());
        assertEquals(15L, result.series().get(0).points().get(6).tokens());
    }

    private Object[] summaryRow(LocalDateTime startTime, Long totalTokens) {
        return new Object[] { Timestamp.valueOf(startTime), totalTokens };
    }

    private Object[] curveRow(Long projectId, LocalDateTime startTime, Long totalTokens) {
        return new Object[] { projectId, Timestamp.valueOf(startTime), totalTokens };
    }
}
