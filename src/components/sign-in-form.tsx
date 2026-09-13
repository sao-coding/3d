import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">登入</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input id="email" type="email" {...field} />}
          />
          {errors.email && <p className="text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密碼</Label>
          <Controller
            name="password"
            control={control}
            render={({ field }) => <Input id="password" type="password" {...field} />}
          />
          {errors.password && <p className="text-red-500">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "登入中..." : "登入"}
        </Button>
      </form>
    </div>
  );
}
