import { AuthGuard } from "@/components/auth/AuthGuard";

export default function UploadLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}

