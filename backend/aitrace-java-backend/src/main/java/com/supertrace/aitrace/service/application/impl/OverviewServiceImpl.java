package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.repository.StepRepository;
import com.supertrace.aitrace.service.application.OverviewService;
import com.supertrace.aitrace.service.application.model.OverviewProjectTokenCurveData;
import com.supertrace.aitrace.service.application.model.OverviewSummaryData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurvePointData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveQuery;
import com.supertrace.aitrace.service.domain.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OverviewServiceImpl implements OverviewService {
    private static final int ONE_DAY_HOURS = 24;
    private static final int SEVEN_DAYS_HOURS = 24 * 7;
    private static final int THIRTY_DAYS_HOURS = 24 * 30;

    private final ProjectService projectService;
    private final StepRepository stepRepository;

    @Override
    public OverviewSummaryData getSummary(UUID userId) {
        List<Project> projects = projectService.getProjectsByUserId(userId);
        if (projects.isEmpty()) {
            return new OverviewSummaryData(0, 0L, 0L, 0L, null, null);
        }

        List<Long> projectIds = projects.stream().map(Project::getId).toList();
        List<Object[]> rows = stepRepository.findTokenSnapshotsByProjectIds(projectIds);
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate dayBeforeYesterday = today.minusDays(2);

        long lifetimeTotalTokens = 0L;
        long todayTotalTokens = 0L;
        long yesterdayTotalTokens = 0L;
        long dayBeforeYesterdayTotalTokens = 0L;

        for (Object[] row : rows) {
            LocalDate date = ((Timestamp) row[0]).toLocalDateTime().toLocalDate();
            long tokens = ((Number) row[1]).longValue();
            lifetimeTotalTokens += tokens;
            if (date.equals(today)) {
                todayTotalTokens += tokens;
            } else if (date.equals(yesterday)) {
                yesterdayTotalTokens += tokens;
            } else if (date.equals(dayBeforeYesterday)) {
                dayBeforeYesterdayTotalTokens += tokens;
            }
        }

        return new OverviewSummaryData(
            projects.size(),
            lifetimeTotalTokens,
            yesterdayTotalTokens,
            todayTotalTokens,
            calculatePercentageChange(yesterdayTotalTokens, todayTotalTokens),
            calculatePercentageChange(dayBeforeYesterdayTotalTokens, yesterdayTotalTokens)
        );
    }

    @Override
    public OverviewTokenCurveData getTokenCurve(UUID userId, OverviewTokenCurveQuery query) {
        int windowHours = normalizeWindowHours(query.windowHours());
        String granularity = granularityForWindow(windowHours);
        List<Project> ownedProjects = projectService.getProjectsByUserId(userId);
        if (ownedProjects.isEmpty()) {
            return new OverviewTokenCurveData(windowHours, granularity, List.of(), List.of());
        }

        List<Long> ownedProjectIds = ownedProjects.stream().map(Project::getId).toList();
        List<Long> selectedProjectIds = selectProjectIds(ownedProjectIds, query.projectIds());
        if (selectedProjectIds.isEmpty()) {
            return new OverviewTokenCurveData(windowHours, granularity, List.of(), List.of());
        }

        LocalDateTime start;
        LocalDateTime end;
        LocalDate today = LocalDate.now();
        if (windowHours == ONE_DAY_HOURS) {
            start = today.atStartOfDay();
            end = start.plusDays(1);
        } else {
            long days = windowHours / 24L;
            start = today.minusDays(days - 1L).atStartOfDay();
            end = today.plusDays(1).atStartOfDay();
        }

        List<Object[]> rows = stepRepository.findProjectTokenSnapshotsByProjectIdsAndStartTimeBetween(
            selectedProjectIds,
            start,
            end
        );

        Map<Long, Project> ownedProjectById = ownedProjects.stream()
            .collect(Collectors.toMap(Project::getId, Function.identity()));

        List<OverviewProjectTokenCurveData> series = selectedProjectIds.stream()
            .map(projectId -> {
                Project project = ownedProjectById.get(projectId);
                return new OverviewProjectTokenCurveData(
                    projectId,
                    project == null ? String.valueOf(projectId) : project.getName(),
                    buildCurvePoints(rows, projectId, start, end, granularity)
                );
            })
            .toList();

        return new OverviewTokenCurveData(
            windowHours,
            granularity,
            selectedProjectIds,
            series
        );
    }

    static Double calculatePercentageChange(long previousValue, long currentValue) {
        if (previousValue == 0L) {
            return null;
        }
        return ((currentValue - previousValue) * 100.0) / previousValue;
    }

    private static List<Long> selectProjectIds(List<Long> ownedProjectIds, List<Long> requestedProjectIds) {
        if (requestedProjectIds == null || requestedProjectIds.isEmpty()) {
            return ownedProjectIds;
        }
        return requestedProjectIds.stream().filter(ownedProjectIds::contains).distinct().toList();
    }

    private static List<OverviewTokenCurvePointData> buildCurvePoints(
        List<Object[]> rows,
        Long projectId,
        LocalDateTime start,
        LocalDateTime end,
        String granularity
    ) {
        Map<LocalDateTime, Long> buckets = new LinkedHashMap<>();
        LocalDateTime cursor = start;
        while (cursor.isBefore(end)) {
            buckets.put(cursor, 0L);
            cursor = "hour".equals(granularity) ? cursor.plusHours(1) : cursor.plusDays(1);
        }

        for (Object[] row : rows) {
            Long rowProjectId = ((Number) row[0]).longValue();
            if (!projectId.equals(rowProjectId)) {
                continue;
            }

            LocalDateTime startTime = ((Timestamp) row[1]).toLocalDateTime();
            long tokens = ((Number) row[2]).longValue();
            LocalDateTime bucketStart = "hour".equals(granularity)
                ? startTime.truncatedTo(ChronoUnit.HOURS)
                : startTime.toLocalDate().atStartOfDay();
            if (!bucketStart.isBefore(start) && bucketStart.isBefore(end)) {
                buckets.computeIfPresent(bucketStart, (key, value) -> value + tokens);
            }
        }

        return buckets.entrySet().stream()
            .map(entry -> new OverviewTokenCurvePointData(entry.getKey(), entry.getValue()))
            .toList();
    }

    private static int normalizeWindowHours(int windowHours) {
        if (windowHours == ONE_DAY_HOURS || windowHours == SEVEN_DAYS_HOURS || windowHours == THIRTY_DAYS_HOURS) {
            return windowHours;
        }
        return THIRTY_DAYS_HOURS;
    }

    private static String granularityForWindow(int windowHours) {
        return windowHours == ONE_DAY_HOURS ? "hour" : "day";
    }
}
