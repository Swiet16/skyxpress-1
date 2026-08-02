import { Toaster as Sonner } from "sonner";
import { airToast } from "@/components/ui/air-toast";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      toastOptions={{ unstyled: true, style: { background: "transparent", boxShadow: "none", padding: 0 } }}
      {...props}
    />
  );
};

// Re-export airToast as `toast` so existing `import { toast } from "@/components/ui/sonner"` calls
// automatically get the animated version.
const toast = (title: string, opts?: { description?: string; type?: "success" | "error" | "info" | "warning" }) => {
  airToast(title, opts?.description, opts?.type ?? "success");
};
toast.success = (title: string, opts?: { description?: string }) => airToast(title, opts?.description, "success");
toast.error   = (title: string, opts?: { description?: string }) => airToast(title, opts?.description, "error");
toast.info    = (title: string, opts?: { description?: string }) => airToast(title, opts?.description, "info");
toast.warning = (title: string, opts?: { description?: string }) => airToast(title, opts?.description, "warning");

export { Toaster, toast, airToast };
