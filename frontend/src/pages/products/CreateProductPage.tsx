import { Input, Select, Textarea } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import {
  useCreateProduct,
  useMyProducts,
  useUpdateProduct,
} from "@/hooks/useApi";
import { Link, useNavigate } from "@tanstack/react-router";
import { Info, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CATS = [
  "Electronics",
  "Fashion",
  "Agriculture",
  "Automotive",
  "Food",
  "Home",
  "Health",
  "Education",
  "Books",
  "Sports",
  "Other",
].map((v) => ({ value: v, label: v }));

export default function CreateProductPage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: myProductsData, isLoading: myProductsLoading } =
    useMyProducts();
  const editId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("edit") || ""
      : "";

  const myProducts: any[] = (myProductsData as any)?.data ?? [];
  const currentProduct = useMemo(
    () => myProducts.find((product) => String(product._id) === String(editId)),
    [myProducts, editId],
  );
  const isEditing = Boolean(editId && currentProduct);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [cond, setCond] = useState("new");
  const [qty, setQty] = useState("1");
  const [city, setCity] = useState("");
  const [discType, setDiscType] = useState("");
  const [discVal, setDiscVal] = useState("");

  useEffect(() => {
    if (!currentProduct) return;

    setTitle(currentProduct.title || "");
    setDesc(currentProduct.description || "");
    setCat(currentProduct.category || "");
    setPrice(String(currentProduct.price ?? ""));
    setCond(currentProduct.condition || "new");
    setQty(String(currentProduct.inventory?.quantity ?? 0));
    setCity(currentProduct.location?.city || "");
    setDiscType(currentProduct.discount?.type || "");
    setDiscVal(
      currentProduct.discount?.value !== undefined
        ? String(currentProduct.discount.value)
        : "",
    );
  }, [currentProduct]);

  const isValid =
    title.length >= 5 && desc.length >= 20 && cat && price && Number(price) > 0;
  const previewPrice =
    discType && discVal
      ? discType === "percent"
        ? Number(price) * (1 - Number(discVal) / 100)
        : Math.max(0, Number(price) - Number(discVal))
      : Number(price);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const body: any = {
        title,
        description: desc,
        category: cat,
        price: Number(price),
        condition: cond,
        inventory: { quantity: Number(qty) || 0 },
      };
      if (city) body.location = { city };
      if (discType && discVal)
        body.discount = { type: discType, value: Number(discVal) };

      const res = isEditing
        ? await updateProduct.mutateAsync({ id: editId, ...body })
        : await createProduct.mutateAsync(body as any);

      navigate({ to: `/products/${(res as any).data?.slug ?? ""}` });
    } catch {}
  };

  if (editId && myProductsLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Spinner size={26} className="text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
          <Package size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
            {isEditing ? "Edit Product" : "List a Product"}
          </h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            {isEditing
              ? "Update price, stock, and listing details"
              : "Sell new or used items to buyers across Zimbabwe"}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            Product Details
          </h2>
          <div>
            <label className="label">
              Product Title <span className="text-brand-orange">*</span>
            </label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. iPhone 13 Pro 256GB Space Grey"
              maxLength={120}
            />
          </div>
          <Textarea
            label="Description *"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe the product condition, features, included accessories, reason for selling…"
            rows={5}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category *"
              options={CATS}
              placeholder="Select category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            />
            <Select
              label="Condition"
              options={[
                { value: "new", label: "New" },
                { value: "used", label: "Used" },
                { value: "refurbished", label: "Refurbished" },
              ]}
              value={cond}
              onChange={(e) => setCond(e.target.value)}
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            Pricing & Stock
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Price (USD) <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm font-semibold">
                  $
                </span>
                <input
                  type="number"
                  className="input pl-7"
                  min="0.01"
                  step="0.01"
                  placeholder="25.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            <Input
              label="Stock Quantity"
              type="number"
              min="0"
              placeholder="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div>
            <h3 className="font-medium text-text-primary dark:text-white text-sm mb-3">
              Discount{" "}
              <span className="text-text-tertiary dark:text-slate-500 font-normal">
                (optional)
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Discount type"
                options={[
                  { value: "", label: "No discount" },
                  { value: "percent", label: "Percentage off" },
                  { value: "fixed", label: "Fixed amount off" },
                ]}
                value={discType}
                onChange={(e) => {
                  setDiscType(e.target.value);
                  setDiscVal("");
                }}
              />
              {discType && (
                <Input
                  label={
                    discType === "percent" ? "Percentage (%)" : "Amount ($)"
                  }
                  type="number"
                  min="1"
                  max={discType === "percent" ? "99" : price}
                  placeholder={discType === "percent" ? "20" : "5"}
                  value={discVal}
                  onChange={(e) => setDiscVal(e.target.value)}
                />
              )}
            </div>
            {discType && discVal && Number(price) > 0 && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl text-sm">
                <span className="text-text-tertiary dark:text-slate-500">
                  Buyers will pay:{" "}
                </span>
                <span className="font-bold text-brand-green">
                  ${previewPrice.toFixed(2)}
                </span>
                <span className="text-text-tertiary dark:text-slate-500 line-through ml-2">
                  ${Number(price).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary dark:text-white border-b border-surface-100 dark:border-dark-border pb-3">
            Location{" "}
            <span className="text-text-tertiary dark:text-slate-500 font-normal text-sm">
              (optional)
            </span>
          </h2>
          <Input
            label="City"
            placeholder="e.g. Harare, Bulawayo, Mutare"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            hint="Helps local buyers find your listing"
          />
        </div>

        <div className="card p-4 flex items-start gap-3 bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800">
          <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary dark:text-slate-300">
            A 7% platform fee applies when your item sells. You receive 93% of
            the final sale price.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/products" className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={
              createProduct.isPending || updateProduct.isPending || !isValid
            }
            aria-busy={createProduct.isPending || updateProduct.isPending}
          >
            {createProduct.isPending || updateProduct.isPending ? (
              <>
                <Spinner size={14} className="text-white" />
                {isEditing ? "Saving…" : "Listing…"}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "List Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
