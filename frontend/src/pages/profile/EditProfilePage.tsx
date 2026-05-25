import AccountSecurityPanel from "@/components/common/AccountSecurityPanel";
import { Input, Select, Textarea } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import {
  useKYCStatus,
  useSubmitKYC,
  useUpdateProfile,
  useUploadAvatar,
} from "@/hooks/useApi";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().min(2, "Required"),
  bio: z.string().max(500).optional(),
  skills: z.string().optional(),
  availabilityStatus: z.enum(["available", "busy", "offline"]),
});

const DOC_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's Licence" },
];

export default function EditProfilePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"profile" | "kyc" | "security">("profile");

  return (
    <div className="page-container py-10 max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
          Account Settings
        </h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
          Manage your profile and verification
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-dark-border mb-8 gap-1">
        {[
          { id: "profile", label: "Profile" },
          { id: "kyc", label: "KYC Verification" },
          { id: "security", label: "Security" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <ProfileTab user={user} />
      ) : tab === "kyc" ? (
        <KYCTab />
      ) : (
        <AccountSecurityPanel />
      )}
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      bio: user?.bio ?? "",
      skills: (user?.skills ?? []).join(", "),
      availabilityStatus: user?.availabilityStatus ?? "available",
    },
  });

  const onSubmit = async (data: any) => {
    await updateProfile.mutateAsync({
      ...data,
      skills:
        data.skills
          ?.split(",")
          .map((s: string) => s.trim())
          .filter(Boolean) ?? [],
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="card p-6">
        <h2 className="font-semibold text-text-primary dark:text-white mb-4">
          Profile Photo
        </h2>
        <div className="flex items-center gap-5">
          <div className="relative group">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="avatar w-20 h-20 ring-2 ring-surface-200 dark:ring-dark-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-orange text-white text-xl font-bold flex items-center justify-center ring-2 ring-surface-200 dark:ring-dark-border">
                {getInitials(user?.fullName ?? "U")}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadAvatar.isPending ? (
                <Spinner size={18} className="text-white" />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="btn-secondary text-sm"
            >
              {uploadAvatar.isPending ? "Uploading…" : "Change Photo"}
            </button>
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1.5">
              JPG, PNG or WebP · max 5 MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) {
                toast.error("Max 5 MB");
                return;
              }
              uploadAvatar.mutate(f);
            }}
          />
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary dark:text-white">
          Basic Info
        </h2>
        <Input
          label="Full Name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Textarea
          label="Bio"
          placeholder="Tell people about yourself and what you do…"
          rows={4}
          error={errors.bio?.message}
          {...register("bio")}
        />
        <Input
          label="Skills (comma-separated)"
          placeholder="React, Design, Photography, Writing"
          hint="Separate each skill with a comma"
          {...register("skills")}
        />
        <Select
          label="Availability"
          options={[
            { value: "available", label: "Available for work" },
            { value: "busy", label: "Busy — not taking orders" },
            { value: "offline", label: "Offline" },
          ]}
          {...register("availabilityStatus")}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={updateProfile.isPending || !isDirty}
        aria-busy={updateProfile.isPending}
      >
        {updateProfile.isPending ? (
          <>
            <Spinner size={14} className="text-white" />
            Saving…
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </form>
  );
}

function KYCTab() {
  const { data: kyc, isLoading } = useKYCStatus();
  const submitKYC = useSubmitKYC();
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [docType, setDocType] = useState("");
  const [docNum, setDocNum] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const valid = Array.from(list).filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} too large (max 10 MB)`);
        return false;
      }
      return true;
    });
    setFiles((p) => [...p, ...valid].slice(0, 5));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      toast.error("Upload at least one document");
      return;
    }
    if (!docType) {
      toast.error("Select document type");
      return;
    }
    if (!docNum.trim()) {
      toast.error("Enter document number");
      return;
    }
    const fd = new FormData();
    fd.append("documentType", docType);
    fd.append("documentNumber", docNum);
    files.forEach((f) => fd.append("documents", f));
    await submitKYC.mutateAsync(fd);
  };

  const k = kyc as any;

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size={28} className="text-brand-orange" />
      </div>
    );

  if (k?.isVerified)
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-brand-green" />
        </div>
        <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
          Identity Verified
        </h2>
        <p className="text-text-secondary dark:text-slate-400 text-sm">
          Your KYC is complete. The verified badge is active on your profile.
        </p>
      </div>
    );

  if (k?.status === "pending")
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-brand-amber" />
        </div>
        <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
          Under Review
        </h2>
        <p className="text-text-secondary dark:text-slate-400 text-sm">
          Your documents are being reviewed. This takes 24–48 hours.
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      {k?.status === "rejected" && (
        <div className="card p-4 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-text-primary dark:text-white">
                Previous submission rejected
              </p>
              {k.rejectionReason && (
                <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5">
                  Reason: {k.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Benefits */}
      {k?.status !== "rejected" && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-brand-orange" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary dark:text-white">
                Get Verified
              </h2>
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                One-time identity check
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {[
              "Verified badge builds buyer trust",
              "Higher withdrawal limits",
              "Priority in search results",
              "Access to premium features",
            ].map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300"
              >
                <ChevronRight
                  size={13}
                  className="text-brand-orange shrink-0"
                />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary dark:text-white">
            {k?.status === "rejected"
              ? "Resubmit Documents"
              : "Submit Documents"}
          </h2>
          <Select
            label="Document Type *"
            placeholder="Select document type"
            options={DOC_TYPES}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          />
          <Input
            label="Document Number *"
            placeholder="e.g. 63-123456A78"
            value={docNum}
            onChange={(e) => setDocNum(e.target.value)}
          />

          {/* Dropzone */}
          <div
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload documents"
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
              dragOver
                ? "border-brand-orange bg-brand-orange-50 dark:bg-brand-orange/10"
                : "border-surface-300 dark:border-dark-border hover:border-brand-orange hover:bg-brand-orange-50/30 dark:hover:bg-brand-orange/5",
            )}
          >
            <Upload
              size={28}
              className="mx-auto mb-3 text-text-tertiary dark:text-slate-500"
            />
            <p className="text-sm font-medium text-text-primary dark:text-white">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
              JPG, PNG, WebP or PDF · max 10 MB each
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-dark-hover rounded-xl"
                >
                  <FileText size={15} className="text-brand-orange shrink-0" />
                  <span className="flex-1 text-sm text-text-primary dark:text-white truncate">
                    {f.name}
                  </span>
                  <span className="text-xs text-text-tertiary dark:text-slate-500 shrink-0">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    className="text-text-tertiary hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-text-tertiary dark:text-slate-500 px-1">
          Your documents are encrypted and only accessible to authorised Hupfumi
          staff.
        </p>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={
            submitKYC.isPending || !files.length || !docType || !docNum.trim()
          }
          aria-busy={submitKYC.isPending}
        >
          {submitKYC.isPending ? (
            <>
              <Spinner size={14} className="text-white" />
              Submitting…
            </>
          ) : k?.status === "rejected" ? (
            "Resubmit Documents"
          ) : (
            "Submit for Verification"
          )}
        </button>
      </form>
    </div>
  );
}
