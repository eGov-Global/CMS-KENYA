import useUiConstantWindow from "./useUiConstantWindow";

// Withdraw window (RAINMAKER-PGR.UIConstants.WITHDRAWSLA, measured from filing) — see
// useUiConstantWindow. pgr-services enforces the same value through its actionWindows.
const useWithdrawWindow = (tenantId) => useUiConstantWindow(tenantId, "WITHDRAWSLA");

export default useWithdrawWindow;
