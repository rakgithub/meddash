/** Treats an empty string (`?page=`, `PORT=`) as "not provided". */
export const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
