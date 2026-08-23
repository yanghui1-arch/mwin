import http from "./http"
import type { StepPayload } from "./payload"

type Response<T> = {
    code: number,
    message: string,
    data: T
}

type DeleteStepsParams = {
    deleteIds: string[]
}

export const stepApi = {

    getPayload(stepId: string) {
        return http.get<Response<StepPayload>>(
            `/v0/step/${encodeURIComponent(stepId)}/payload`,
            { timeout: 30000 },
        )
    },

    deleteSteps({ deleteIds }: DeleteStepsParams) {
        return http.post<Response<string[]>>(
            "/v0/step/delete",
            deleteIds,
        )
    },
}
