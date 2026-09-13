import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const signInSchema = z.object({
  email: z.email("信箱格式不正確"),
  password: z.string().min(8, "密碼至少需要 8 個字元"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInForm() {
  const navigate = useNavigate({ from: "/login" });
  const search = useSearch({ from: "/login" });
  const { isPending } = authClient.useSession();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (values: SignInValues) => {
    await authClient.signIn.email(
      { email: values.email, password: values.password },
      {
        onSuccess: () => {
          toast.success("登入成功");
          navigate({ to: search.redirect || "/" });
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16">
      <Card className="card-glow animate-rise">
        <CardHeader className="items-center text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg shadow-brand/25">
            <Printer className="size-6" />
          </span>
          <CardTitle className="mt-3 text-2xl">賣家登入</CardTitle>
          <p className="text-sm text-muted-foreground">登入後才能管理線材、參數與報價歷史。</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input id="email" type="email" autoComplete="email" {...field} />
                )}
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input id="password" type="password" autoComplete="current-password" {...field} />
                )}
              />
              {errors.password && (
                <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-brand to-brand-2 text-base font-semibold text-white shadow-lg shadow-brand/25"
              disabled={isSubmitting}
            >
              {isSubmitting ? "登入中..." : "登入"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
