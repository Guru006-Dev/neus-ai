const RUN_ID = /^wf-[a-z0-9]+$/

/** True only for ids shaped like the backend's workflow ids; guards navigation from free-text input. */
export const isRunId = (v: string): boolean => RUN_ID.test(v)
