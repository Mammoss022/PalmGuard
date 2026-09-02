import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-10">
      <Link
        href="/"
        aria-label="กลับหน้าแรก"
        className="absolute left-4 top-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        กลับ
      </Link>
      <Link href="/" className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-primary">
        <Leaf className="size-6" aria-hidden />
        PalmGuard
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}
