import { redirect } from "next/navigation";
import { Button } from "@ldd/ui";
import { createClient } from "@/lib/supabase/server";
import { DuckWidget } from "@/components/DuckWidget";
import { TodoWidget } from "@/components/TodoWidget";
import { MemoWidget } from "@/components/MemoWidget";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email;

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        <p>환영합니다, {displayName}님</p>
        <form action="/auth/logout" method="post">
          <Button type="submit">로그아웃</Button>
        </form>
      </div>

      <div style={{ width: "100%", maxWidth: "300px" }}>
        <DuckWidget />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          justifyContent: "center",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        <TodoWidget />
        <MemoWidget />
      </div>
    </main>
  );
}
