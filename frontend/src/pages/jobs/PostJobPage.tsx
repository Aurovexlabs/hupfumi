import { Input, Select, Textarea } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import { useCreateJob, useMyJobs, useUpdateJob } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const CATS = [
  "Technology",
  "Design",
  "Writing",
  "Marketing",
  "Engineering",
  "Finance",
  "Education",
  "Agriculture",
  "Construction",
  "Other",
].map((v) => ({ value: v, label: v }));

const schema = z
  .object({
    title: z.string().min(10, "Min 10 characters"),
    description: z.string().min(50, "Min 50 characters"),
    category: z.string().min(1, "Select a category"),
    jobType: z.enum(["fixed", "hourly"]),
    budgetMin: z.string().min(1, "Required"),
    budgetMax: z.string().min(1, "Required"),
    skills: z.string().optional(),
    deadline: z.string().optional(),
  })
  .refine((data) => Number(data.budgetMax) >= Number(data.budgetMin), {
    path: ["budgetMax"],
    message: "Max budget must be greater than or equal to min budget",
  });

type PostJobFormValues = z.infer<typeof schema>;

export default function PostJobPage() {
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const { data: myJobsData, isLoading: myJobsLoading } = useMyJobs();
  const editId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("edit") || ""
      : "";

  const jobs: any[] = (myJobsData as any)?.data ?? [];
  const currentJob = useMemo(
    () => jobs.find((job) => String(job._id) === String(editId)),
    [jobs, editId],
  );
  const isEditing = Boolean(editId && currentJob);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PostJobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { jobType: "fixed" },
  });

  useEffect(() => {
    if (!currentJob) return;

    reset({
      title: currentJob.title || "",
      description: currentJob.description || "",
      category: currentJob.category || "",
      jobType: currentJob.jobType || "fixed",
      budgetMin: String(currentJob.budget?.min ?? ""),
      budgetMax: String(currentJob.budget?.max ?? ""),
      skills: Array.isArray(currentJob.skills)
        ? currentJob.skills.join(", ")
        : "",
      deadline: currentJob.deadline
        ? new Date(currentJob.deadline).toISOString().slice(0, 10)
        : "",
    });
  }, [currentJob, reset]);

  const onSubmit = async (data: PostJobFormValues) => {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        category: data.category,
        jobType: data.jobType,
        budget: {
          min: Number(data.budgetMin),
          max: Number(data.budgetMax),
          currency: "USD",
        },
        skills: (data.skills || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        deadline: data.deadline || undefined,
      };

      const res = isEditing
        ? await updateJob.mutateAsync({ id: editId, ...payload })
        : await createJob.mutateAsync(payload);

      navigate({ to: `/jobs/${(res as any).data?.slug ?? ""}` });
    } catch {}
  };

  if (editId && myJobsLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Spinner size={26} className="text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center">
          <Briefcase size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
            {isEditing ? "Edit Job" : "Post a Job"}
          </h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            {isEditing
              ? "Update your listing with new details"
              : "Find the perfect professional for your project"}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            Job Details
          </h2>
          <Input
            label="Job Title"
            placeholder="e.g. Senior React Developer for E-commerce Platform"
            error={errors.title?.message as string}
            {...register("title")}
          />
          <Textarea
            label="Full Description"
            placeholder="Describe the work, deliverables, timeline, and requirements…"
            rows={7}
            error={errors.description?.message as string}
            {...register("description")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={CATS}
              placeholder="Select category"
              error={errors.category?.message as string}
              {...register("category")}
            />
            <Select
              label="Job Type"
              options={[
                { value: "fixed", label: "Fixed Price" },
                { value: "hourly", label: "Hourly Rate" },
              ]}
              error={errors.jobType?.message as string}
              {...register("jobType")}
            />
          </div>
          <Input
            label="Required Skills (comma-separated)"
            placeholder="e.g. React, Node.js, MongoDB"
            {...register("skills")}
          />
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            Budget & Timeline
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Budget (USD)"
              type="number"
              placeholder="100"
              min="1"
              leftIcon={
                <span className="text-text-tertiary text-sm font-semibold">
                  $
                </span>
              }
              error={errors.budgetMin?.message as string}
              {...register("budgetMin")}
            />
            <Input
              label="Max Budget (USD)"
              type="number"
              placeholder="5000"
              min="1"
              leftIcon={
                <span className="text-text-tertiary text-sm font-semibold">
                  $
                </span>
              }
              error={errors.budgetMax?.message as string}
              {...register("budgetMax")}
            />
          </div>
          <Input
            label="Application Deadline (optional)"
            type="date"
            {...register("deadline")}
          />
        </div>
        <div className="flex gap-3">
          <Link to="/jobs" className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={createJob.isPending || updateJob.isPending}
            aria-busy={createJob.isPending || updateJob.isPending}
          >
            {createJob.isPending || updateJob.isPending ? (
              <>
                <Spinner size={14} className="text-white" />
                {isEditing ? "Saving…" : "Posting…"}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Post Job"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
