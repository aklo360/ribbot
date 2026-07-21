import { afterEach, describe, expect, it, vi } from "vitest";

import { loadTradingConfig } from "./config.ts";

const ALERT_ENV_KEYS = [
    "RIBBOT_ACTIVITY_ALERTS_ENABLED",
    "RIBBOT_ACTIVITY_ALERT_POLL_INTERVAL_MS",
    "RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL",
    "RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE",
    "RIBBOT_ALPHA_ALERTS_ENABLED",
    "RIBBOT_ALPHA_ALERT_POLL_INTERVAL_MS",
    "RIBBOT_ALPHA_ALERT_MAX_USERS_PER_POLL",
    "RIBBOT_ALPHA_ALERT_MAX_SIGNALS_PER_MESSAGE",
];

afterEach(() => {
    vi.unstubAllEnvs();
});

function runtime(settings: Record<string, string | undefined> = {}) {
    return {
        getSetting: (key: string) => settings[key],
    } as Parameters<typeof loadTradingConfig>[0];
}

describe("activity alert config", () => {
    it("is disabled by default with bounded poll defaults", () => {
        ALERT_ENV_KEYS.forEach((key) => vi.stubEnv(key, ""));

        const config = loadTradingConfig(runtime());

        expect(config).toMatchObject({
            activityAlertsEnabled: false,
            activityAlertPollIntervalMs: 30_000,
            activityAlertMaxUsersPerPoll: 25,
            activityAlertMaxEventsPerMessage: 5,
            alphaAlertsEnabled: false,
            alphaAlertPollIntervalMs: 30_000,
            alphaAlertMaxUsersPerPoll: 25,
            alphaAlertMaxSignalsPerMessage: 3,
        });
    });

    it("clamps operator-provided poll limits", () => {
        const config = loadTradingConfig(
            runtime({
                RIBBOT_ACTIVITY_ALERTS_ENABLED: "true",
                RIBBOT_ACTIVITY_ALERT_POLL_INTERVAL_MS: "1000",
                RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL: "1000",
                RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE: "0",
                RIBBOT_ALPHA_ALERTS_ENABLED: "true",
                RIBBOT_ALPHA_ALERT_POLL_INTERVAL_MS: "1000",
                RIBBOT_ALPHA_ALERT_MAX_USERS_PER_POLL: "1000",
                RIBBOT_ALPHA_ALERT_MAX_SIGNALS_PER_MESSAGE: "99",
            })
        );

        expect(config).toMatchObject({
            activityAlertsEnabled: true,
            activityAlertPollIntervalMs: 10_000,
            activityAlertMaxUsersPerPoll: 100,
            activityAlertMaxEventsPerMessage: 1,
            alphaAlertsEnabled: true,
            alphaAlertPollIntervalMs: 10_000,
            alphaAlertMaxUsersPerPoll: 100,
            alphaAlertMaxSignalsPerMessage: 5,
        });
    });
});
