import { Input, Select } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import {
  useCreateService,
  useMyServices,
  useUpdateService,
} from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STEPS = ["Basics", "Pricing", "Details", "Review"];
const CATS = [
  "Technology",
  "Design",
  "Writing",
  "Marketing",
  "Engineering",
  "Education",
  "Finance",
  "Photography",
  "Music",
  "Legal",
  "Other",
].map((v) => ({ value: v, label: v }));

interface PricingTier {
  name: string;
  title: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string[];
}
const EMPTY_TIER = (name: string): PricingTier => ({
  name,
  title: "",
  price: "",
  deliveryDays: "3",
  revisions: "1",
  features: [],
});

export default function CreateServicePage() {
  const navigate = useNavigate();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const { data: myServicesData, isLoading: myServicesLoading } =
    useMyServices();
  const editId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("edit") || ""
      : "";

  const services: any[] = (myServicesData as any)?.data ?? [];
  const currentService = useMemo(
    () => services.find((service) => String(service._id) === String(editId)),
    [services, editId],
  );
  const isEditing = Boolean(editId && currentService);

  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [tiers, setTiers] = useState<PricingTier[]>([EMPTY_TIER("basic")]);
  const [useTiers, setUseTiers] = useState(false);
  const [faqs, setFaqs] = useState([{ question: "", answer: "" }]);

  useEffect(() => {
    if (!currentService) return;

    const pricing = Array.isArray(currentService.pricing)
      ? currentService.pricing
      : [];

    setTitle(currentService.title || "");
    setDescription(currentService.description || "");
    setCategory(currentService.category || "");
    setTags(
      Array.isArray(currentService.tags) ? currentService.tags.join(", ") : "",
    );
    setTiers(
      pricing.length
        ? pricing.map((tier: any) => ({
            name: String(tier.name || "basic"),
            title: String(tier.title || tier.name || ""),
            price: String(tier.price ?? ""),
            deliveryDays: String(tier.deliveryDays ?? "3"),
            revisions: String(tier.revisions ?? "1"),
            features: Array.isArray(tier.features) ? tier.features : [],
          }))
        : [EMPTY_TIER("basic")],
    );
    setUseTiers(pricing.length > 1);
    setFaqs(
      Array.isArray(currentService.faqs) && currentService.faqs.length
        ? currentService.faqs.map((faq: any) => ({
            question: String(faq.question || ""),
            answer: String(faq.answer || ""),
          }))
        : [{ question: "", answer: "" }],
    );
  }, [currentService]);

  const addFaq = () => setFaqs((f) => [...f, { question: "", answer: "" }]);
  const removeFaq = (i: number) =>
    setFaqs((f) => f.filter((_, idx) => idx !== i));
  const setFaq = (i: number, field: "question" | "answer", val: string) =>
    setFaqs((f) =>
      f.map((faq, idx) => (idx === i ? { ...faq, [field]: val } : faq)),
    );

  const addFeature = (ti: number) =>
    setTiers((ts) =>
      ts.map((t, i) =>
        i === ti ? { ...t, features: [...t.features, ""] } : t,
      ),
    );
  const setFeature = (ti: number, fi: number, val: string) =>
    setTiers((ts) =>
      ts.map((t, i) =>
        i === ti
          ? { ...t, features: t.features.map((f, j) => (j === fi ? val : f)) }
          : t,
      ),
    );
  const removeFeature = (ti: number, fi: number) =>
    setTiers((ts) =>
      ts.map((t, i) =>
        i === ti
          ? { ...t, features: t.features.filter((_, j) => j !== fi) }
          : t,
      ),
    );
  const setTierField = (ti: number, field: keyof PricingTier, val: string) =>
    setTiers((ts) => ts.map((t, i) => (i === ti ? { ...t, [field]: val } : t)));

  const toggleTier = (name: string) => {
    setTiers((prev) =>
      prev.some((t) => t.name === name)
        ? prev.filter((t) => t.name !== name)
        : [...prev, EMPTY_TIER(name)].sort(
            (a, b) =>
              ["basic", "standard", "premium"].indexOf(a.name) -
              ["basic", "standard", "premium"].indexOf(b.name),
          ),
    );
  };

  const valid = [
    title.length >= 10 && description.length >= 50 && category,
    tiers.length > 0 &&
      tiers.every((t) => t.price && Number(t.price) >= 1 && t.deliveryDays),
    true,
    true,
  ];

  const submit = async () => {
    try {
      const pricing = tiers.map((t) => ({
        name: t.name,
        title: t.title || t.name,
        price: Number(t.price),
        deliveryDays: Number(t.deliveryDays),
        revisions: Number(t.revisions) || 1,
        features: t.features.filter(Boolean),
      }));
      const payload = {
        title,
        description,
        category,
        pricing,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        faqs: faqs.filter((f) => f.question && f.answer),
      } as any;

      const res = isEditing
        ? await updateService.mutateAsync({ id: editId, ...payload })
        : await createService.mutateAsync(payload);

      navigate({ to: `/services/${(res as any).data?.slug ?? ""}` });
    } catch {}
  };

  if (editId && myServicesLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Spinner size={26} className="text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
            {isEditing ? "Edit Service" : "Create a Service"}
          </h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            {isEditing
              ? "Update your service packages and details"
              : "Share your skills and start earning"}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                i === step
                  ? "bg-brand-orange text-white"
                  : i < step
                    ? "bg-brand-green/10 text-brand-green cursor-pointer"
                    : "text-text-tertiary dark:text-slate-500",
              )}
            >
              {i < step ? (
                <Check size={14} />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">
                  {i + 1}
                </span>
              )}
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight
                size={14}
                className="text-text-disabled dark:text-slate-600 mx-1 shrink-0"
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Basics */}
      {step === 0 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            Service Basics
          </h2>
          <div>
            <label className="label">
              Service Title <span className="text-brand-orange">*</span>
            </label>
            <input
              className={cn(
                "input",
                title.length > 0 && title.length < 10 && "error",
              )}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. I will design a professional logo for your business"
              maxLength={120}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                Min 10 characters
              </p>
              <span className="text-xs text-text-tertiary dark:text-slate-500">
                {title.length}/120
              </span>
            </div>
          </div>
          <Select
            label="Category *"
            options={CATS}
            placeholder="Select category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <div>
            <label className="label">
              Service Description <span className="text-brand-orange">*</span>
            </label>
            <textarea
              className={cn(
                "input resize-y min-h-35",
                description.length > 0 && description.length < 50 && "error",
              )}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you will do, your process, experience, and why clients should choose you. Be detailed — this is your pitch."
              maxLength={5000}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                Min 50 characters
              </p>
              <span className="text-xs text-text-tertiary dark:text-slate-500">
                {description.length}/5000
              </span>
            </div>
          </div>
          <Input
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="logo design, brand identity, illustrator"
            hint="Help buyers find your service"
          />
        </div>
      )}

      {/* Step 1: Pricing */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary dark:text-white">
                Pricing Tiers
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary dark:text-slate-500">
                  Single / Multiple
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUseTiers((p) => !p);
                    if (!useTiers)
                      setTiers([
                        EMPTY_TIER("basic"),
                        EMPTY_TIER("standard"),
                        EMPTY_TIER("premium"),
                      ]);
                    else setTiers([EMPTY_TIER("basic")]);
                  }}
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    useTiers
                      ? "bg-brand-orange"
                      : "bg-surface-300 dark:bg-dark-border",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                      useTiers ? "left-5.5" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {tiers.map((tier, ti) => (
                <div
                  key={tier.name}
                  className="p-4 bg-surface-50 dark:bg-dark-hover rounded-2xl space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "badge capitalize",
                        tier.name === "basic"
                          ? "badge-blue"
                          : tier.name === "standard"
                            ? "badge-orange"
                            : "badge-purple",
                      )}
                    >
                      {tier.name}
                    </span>
                    <Input
                      placeholder="Tier name (e.g. Basic Logo)"
                      value={tier.title}
                      onChange={(e) =>
                        setTierField(ti, "title", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Price (USD) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm font-semibold">
                          $
                        </span>
                        <input
                          type="number"
                          className="input pl-7"
                          min="1"
                          value={tier.price}
                          onChange={(e) =>
                            setTierField(ti, "price", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Delivery (days) *</label>
                      <input
                        type="number"
                        className="input"
                        min="1"
                        max="365"
                        value={tier.deliveryDays}
                        onChange={(e) =>
                          setTierField(ti, "deliveryDays", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Revisions</label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        max="99"
                        value={tier.revisions}
                        onChange={(e) =>
                          setTierField(ti, "revisions", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">What is included</label>
                    <div className="space-y-2">
                      {tier.features.map((f, fi) => (
                        <div key={fi} className="flex gap-2">
                          <input
                            className="input flex-1 text-sm"
                            value={f}
                            onChange={(e) => setFeature(ti, fi, e.target.value)}
                            placeholder="e.g. Source files included"
                          />
                          <button
                            type="button"
                            onClick={() => removeFeature(ti, fi)}
                            className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addFeature(ti)}
                        className="btn-ghost text-xs text-brand-orange"
                      >
                        <Plus size={13} />
                        Add feature
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3 bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary dark:text-slate-300">
              A 7% platform fee applies to each transaction. You receive 93% of
              the order value.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: FAQs */}
      {step === 2 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            FAQs{" "}
            <span className="text-text-tertiary dark:text-slate-500 font-normal text-sm">
              (optional)
            </span>
          </h2>
          <p className="text-sm text-text-secondary dark:text-slate-400">
            Answer common questions buyers might have before ordering.
          </p>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="p-4 bg-surface-50 dark:bg-dark-hover rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide">
                    FAQ {i + 1}
                  </span>
                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      className="btn-icon text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <input
                  className="input text-sm"
                  value={faq.question}
                  onChange={(e) => setFaq(i, "question", e.target.value)}
                  placeholder="e.g. Do you provide source files?"
                />
                <textarea
                  className="input text-sm resize-y min-h-15"
                  value={faq.answer}
                  onChange={(e) => setFaq(i, "answer", e.target.value)}
                  placeholder="Yes, all source files are included in every tier..."
                />
              </div>
            ))}
            {faqs.length < 8 && (
              <button
                type="button"
                onClick={addFaq}
                className="btn-secondary text-sm"
              >
                <Plus size={14} />
                Add FAQ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="font-semibold text-text-primary dark:text-white mb-4">
              Review your service
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-text-tertiary dark:text-slate-500">
                  Title:
                </span>
                <p className="font-medium text-text-primary dark:text-white mt-0.5">
                  {title}
                </p>
              </div>
              <div>
                <span className="text-text-tertiary dark:text-slate-500">
                  Category:
                </span>
                <span className="ml-2 badge badge-blue">{category}</span>
              </div>
              <div>
                <span className="text-text-tertiary dark:text-slate-500">
                  Pricing:
                </span>
                <div className="flex gap-2 mt-1">
                  {tiers.map((t) => (
                    <span key={t.name} className="badge badge-gray capitalize">
                      {t.name} ${t.price}
                    </span>
                  ))}
                </div>
              </div>
              {tags && (
                <div>
                  <span className="text-text-tertiary dark:text-slate-500">
                    Tags:
                  </span>
                  <p className="text-text-secondary dark:text-slate-300 mt-0.5">
                    {tags}
                  </p>
                </div>
              )}
              <div>
                <span className="text-text-tertiary dark:text-slate-500">
                  FAQs:
                </span>
                <span className="ml-2 text-text-secondary dark:text-slate-400">
                  {faqs.filter((f) => f.question).length} added
                </span>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-green-50/50 dark:bg-green-950/10 border-brand-green/20 flex items-start gap-3">
            <Check size={16} className="text-brand-green shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary dark:text-slate-300">
              Your service will be live immediately after publishing. You can
              edit it anytime from your dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-secondary"
          >
            <ChevronLeft size={15} />
            Back
          </button>
        )}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              if (valid[step]) setStep((s) => s + 1);
              else toast.error("Please complete all required fields");
            }}
            className="btn-primary"
          >
            Continue <ChevronRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            className="btn-primary"
            disabled={createService.isPending || updateService.isPending}
            aria-busy={createService.isPending || updateService.isPending}
          >
            {createService.isPending || updateService.isPending ? (
              <>
                <Spinner size={14} className="text-white" />
                {isEditing ? "Saving…" : "Publishing…"}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Publish Service"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
