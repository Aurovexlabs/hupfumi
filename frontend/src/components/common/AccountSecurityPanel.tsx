import {
  useConfirmTwoFactorDisable,
  useConfirmTwoFactorSetup,
  useDeleteAccount,
  useRequestTwoFactorDisable,
  useRequestTwoFactorSetup,
  useUserActivity,
  useUserActivityAction,
} from "@/hooks/useApi";
import { formatRelativeTime } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  KeyRound,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "./LoadingScreen";

export default function AccountSecurityPanel() {
  const user = useAuthStore((state) => state.user);
  const twoFactorEnabled = Boolean(user?.twoFactorEnabled);

  const requestSetup = useRequestTwoFactorSetup();
  const confirmSetup = useConfirmTwoFactorSetup();
  const requestDisable = useRequestTwoFactorDisable();
  const confirmDisable = useConfirmTwoFactorDisable();
  const deleteAccount = useDeleteAccount();
  const { data: activityData, isLoading: activityLoading } = useUserActivity({
    limit: 12,
  });
  const activityAction = useUserActivityAction();

  const [setupOtp, setSetupOtp] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showSetupConfirm, setShowSetupConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const activities: any[] =
    (activityData as any)?.data?.data ?? (activityData as any)?.data ?? [];

  const handleRequestEnable = async () => {
    await requestSetup.mutateAsync();
    setShowSetupConfirm(true);
    toast.success("A 2FA code was sent to your email.");
  };

  const handleConfirmEnable = async () => {
    if (!/^\d{6}$/.test(setupOtp.trim())) {
      toast.error("Enter a valid 6-digit code.");
      return;
    }

    await confirmSetup.mutateAsync({ otp: setupOtp.trim() });
    setSetupOtp("");
    setShowSetupConfirm(false);
    toast.success("Two-factor authentication is now enabled.");
  };

  const handleRequestDisable = async () => {
    await requestDisable.mutateAsync();
    setShowDisableConfirm(true);
    toast.success("A disable-confirmation code was sent to your email.");
  };

  const handleConfirmDisable = async () => {
    if (!/^\d{6}$/.test(disableOtp.trim())) {
      toast.error("Enter a valid 6-digit code.");
      return;
    }

    await confirmDisable.mutateAsync({
      otp: disableOtp.trim(),
      password: disablePassword.trim() ? disablePassword.trim() : undefined,
    });
    setDisableOtp("");
    setDisablePassword("");
    setShowDisableConfirm(false);
    toast.success("Two-factor authentication has been disabled.");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion.");
      return;
    }

    await deleteAccount.mutateAsync({
      confirmation: "DELETE",
      password: deletePassword.trim() ? deletePassword.trim() : undefined,
    });

    toast.success("Your account was deleted.");
    window.location.assign("/login");
  };

  const handleActivityAction = async (
    activityId: string,
    action: "mark_safe" | "report_suspicious" | "lock_account",
  ) => {
    if (action === "lock_account") {
      const confirmed = window.confirm(
        "Lock account now? This will suspend sign-in until support or admin review.",
      );
      if (!confirmed) return;
    }

    await activityAction.mutateAsync({ activityId, action });

    if (action === "lock_account") {
      window.location.assign("/login");
    }
  };

  const busy =
    requestSetup.isPending ||
    confirmSetup.isPending ||
    requestDisable.isPending ||
    confirmDisable.isPending ||
    deleteAccount.isPending ||
    activityAction.isPending;

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <Shield size={16} className="text-brand-orange" />
              Two-factor authentication (2FA)
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
              Protect sign-in with an additional one-time code sent to your
              email.
            </p>
          </div>
          <span
            className={`badge ${twoFactorEnabled ? "badge-green" : "badge-gray"}`}
          >
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {!twoFactorEnabled ? (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRequestEnable}
              disabled={requestSetup.isPending || busy}
            >
              {requestSetup.isPending ? (
                <>
                  <Spinner size={14} className="text-white" /> Sending code…
                </>
              ) : (
                <>
                  <KeyRound size={14} /> Enable 2FA
                </>
              )}
            </button>

            {showSetupConfirm && (
              <div className="mt-4 p-4 rounded-xl border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover">
                <label className="label">Enter verification code</label>
                <input
                  type="text"
                  className="input"
                  inputMode="numeric"
                  placeholder="123456"
                  value={setupOtp}
                  onChange={(event) =>
                    setSetupOtp(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={() => {
                      setSetupOtp("");
                      setShowSetupConfirm(false);
                    }}
                    disabled={confirmSetup.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    onClick={handleConfirmEnable}
                    disabled={confirmSetup.isPending || setupOtp.length !== 6}
                  >
                    {confirmSetup.isPending ? (
                      <>
                        <Spinner size={14} className="text-white" /> Verifying…
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-brand-green mb-3">
              <CheckCircle size={14} />
              Your account requires a one-time code during sign-in.
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleRequestDisable}
              disabled={requestDisable.isPending || busy}
            >
              {requestDisable.isPending ? (
                <>
                  <Spinner size={14} className="text-text-tertiary" /> Sending
                  code…
                </>
              ) : (
                "Disable 2FA"
              )}
            </button>

            {showDisableConfirm && (
              <div className="mt-4 p-4 rounded-xl border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover">
                <label className="label">Disable code</label>
                <input
                  type="text"
                  className="input"
                  inputMode="numeric"
                  placeholder="123456"
                  value={disableOtp}
                  onChange={(event) =>
                    setDisableOtp(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />

                <label className="label mt-3">Current password (if set)</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter your current password"
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.target.value)}
                />

                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={() => {
                      setDisableOtp("");
                      setDisablePassword("");
                      setShowDisableConfirm(false);
                    }}
                    disabled={confirmDisable.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-danger flex-1"
                    onClick={handleConfirmDisable}
                    disabled={
                      confirmDisable.isPending || disableOtp.length !== 6
                    }
                  >
                    {confirmDisable.isPending ? (
                      <>
                        <Spinner size={14} className="text-white" /> Confirming…
                      </>
                    ) : (
                      "Disable"
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <Smartphone size={16} className="text-brand-orange" />
              Recent sign-in activity
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
              Review device, location, and time for each login. Flag anything
              suspicious immediately.
            </p>
          </div>
        </div>

        {activityLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size={22} className="text-brand-orange" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-text-tertiary dark:text-slate-500">
            No activity records yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="p-3 rounded-xl border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary dark:text-white capitalize">
                      {activity.device?.browser || "Unknown browser"} on{" "}
                      {activity.device?.os || "Unknown OS"}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                      {activity.device?.deviceType || "unknown device"} · IP{" "}
                      {activity.ipAddress || "unknown"}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                      {[
                        activity.location?.city,
                        activity.location?.region,
                        activity.location?.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Unknown location"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-text-tertiary dark:text-slate-500 flex items-center gap-1 justify-end">
                      <Clock size={11} />
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                    <div className="flex flex-wrap justify-end gap-1 mt-1.5">
                      {activity.isNewDevice ? (
                        <span className="badge badge-amber">New device</span>
                      ) : null}
                      {activity.suspicious ? (
                        <span className="badge badge-red">Suspicious</span>
                      ) : null}
                      {activity.trusted ? (
                        <span className="badge badge-green">Trusted</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {!activity.reviewedAction ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1.5"
                      onClick={() =>
                        handleActivityAction(activity._id, "mark_safe")
                      }
                      disabled={activityAction.isPending}
                    >
                      Mark safe
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1.5"
                      onClick={() =>
                        handleActivityAction(activity._id, "report_suspicious")
                      }
                      disabled={activityAction.isPending}
                    >
                      Report suspicious
                    </button>
                    <button
                      type="button"
                      className="btn-danger text-xs py-1.5"
                      onClick={() =>
                        handleActivityAction(activity._id, "lock_account")
                      }
                      disabled={activityAction.isPending}
                    >
                      Lock account
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2">
                    Action taken: {activity.reviewedAction.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10">
        <h2 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
          <AlertTriangle size={16} /> Danger zone
        </h2>
        <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
          Permanently delete your account and associated data. This action
          cannot be undone.
        </p>

        <label className="label">Type DELETE to confirm</label>
        <input
          className="input"
          placeholder="DELETE"
          value={deleteConfirmText}
          onChange={(event) => setDeleteConfirmText(event.target.value)}
        />

        <label className="label mt-3">Current password (if set)</label>
        <input
          type="password"
          className="input"
          placeholder="Enter your current password"
          value={deletePassword}
          onChange={(event) => setDeletePassword(event.target.value)}
        />

        <button
          type="button"
          className="btn-danger mt-4"
          onClick={handleDeleteAccount}
          disabled={
            deleteAccount.isPending || deleteConfirmText.trim() !== "DELETE"
          }
        >
          {deleteAccount.isPending ? (
            <>
              <Spinner size={14} className="text-white" /> Deleting account…
            </>
          ) : (
            <>
              <Trash2 size={14} /> Delete account permanently
            </>
          )}
        </button>
      </div>
    </div>
  );
}
