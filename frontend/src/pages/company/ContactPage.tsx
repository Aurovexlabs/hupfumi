import { Spinner } from "@/components/common/LoadingScreen";
import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("Message sent. We will respond within one business day.");
    setForm({ name: "", email: "", subject: "", message: "" });
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="py-20 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container max-w-2xl text-center">
          <p className="section-label mb-3">Contact</p>
          <h1 className="section-title mb-4">Get in touch</h1>
          <p className="text-text-secondary dark:text-slate-400 text-lg">
            We are here to help. Our team responds within one business day.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-brand-navy dark:text-white mb-5">
                  Contact information
                </h2>
                {[
                  {
                    icon: MapPin,
                    label: "Office",
                    val: "12 Samora Machel Ave, Harare, Zimbabwe",
                  },
                  { icon: Mail, label: "Email", val: "support@hupfumi.co.zw" },
                  { icon: Phone, label: "WhatsApp", val: "+263 78 991 1535" },
                  { icon: Clock, label: "Hours", val: "Mon–Fri, 8am–6pm CAT" },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-brand-orange" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide">
                        {label}
                      </p>
                      <p className="text-sm text-text-primary dark:text-white mt-0.5">
                        {val}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-brand-orange" />
                  <p className="font-semibold text-text-primary dark:text-white text-sm">
                    Faster support?
                  </p>
                </div>
                <p className="text-text-secondary dark:text-slate-400 text-xs leading-relaxed">
                  If you have an active order issue, use the in-app messaging
                  system for the fastest response from our moderation team.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="card p-7">
                <h2 className="font-display font-bold text-xl text-brand-navy dark:text-white mb-5">
                  Send a message
                </h2>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Name <span className="text-brand-orange">*</span>
                      </label>
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="label">
                        Email <span className="text-brand-orange">*</span>
                      </label>
                      <input
                        type="email"
                        className="input"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Subject</label>
                    <input
                      className="input"
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      placeholder="What is this about?"
                    />
                  </div>
                  <div>
                    <label className="label">
                      Message <span className="text-brand-orange">*</span>
                    </label>
                    <textarea
                      className="input resize-y min-h-35"
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      placeholder="Describe your issue or question in detail…"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size={14} className="text-white" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
